"""
Project template management API endpoints.
"""

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from ..database import get_db
from ..models.milestone import ProjectTemplate, TemplateMilestone, TemplateRole
from ..schemas.milestone import (
    ProjectTemplateCreate,
    ProjectTemplateUpdate,
    ProjectTemplateResponse,
    ProjectTemplateList,
    TemplateMilestoneCreate,
    TemplateRoleCreate
)
from ..services.milestone_service import MilestoneService
from ..core.dependencies import get_current_user
from ..models.user import User
from ..models.project import Project

router = APIRouter(prefix="/templates", tags=["templates"])

@router.get("/", response_model=List[ProjectTemplateList])
async def get_templates(
    category: Optional[str] = None,
    is_public: Optional[bool] = None,
    search: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get list of project templates with filtering."""
    query = db.query(ProjectTemplate)
    
    if category:
        query = query.filter(ProjectTemplate.category == category)
    
    if is_public is not None:
        if is_public:
            query = query.filter(ProjectTemplate.is_public == True)
        else:
            query = query.filter(
                (ProjectTemplate.is_public == False) & 
                (ProjectTemplate.created_by == current_user.id)
            )
    
    if search:
        query = query.filter(
            (ProjectTemplate.name.ilike(f"%{search}%")) |
            (ProjectTemplate.description.ilike(f"%{search}%"))
        )
    
    templates = query.offset(skip).limit(limit).all()
    return templates

@router.get("/{template_id}", response_model=ProjectTemplateResponse)
async def get_template(
    template_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get a specific project template by ID."""
    template = db.query(ProjectTemplate).filter(ProjectTemplate.id == template_id).first()
    
    if not template:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Template not found"
        )
    
    # Check access permissions
    if not template.is_public and template.created_by != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied to private template"
        )
    
    return template

@router.post("/", response_model=ProjectTemplateResponse)
async def create_template(
    template_data: ProjectTemplateCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new project template."""
    # Create template
    template = ProjectTemplate(
        name=template_data.name,
        description=template_data.description,
        category=template_data.category,
        estimated_duration=template_data.estimated_duration,
        complexity=template_data.complexity,
        tags=template_data.tags,
        is_public=template_data.is_public,
        created_by=current_user.id
    )
    
    db.add(template)
    db.flush()  # Get the ID
    
    # Add milestones
    for milestone_data in template_data.milestones:
        milestone = TemplateMilestone(
            template_id=template.id,
            name=milestone_data.name,
            description=milestone_data.description,
            duration_offset=milestone_data.duration_offset,
            dependencies=milestone_data.dependencies or []
        )
        db.add(milestone)
    
    # Add roles
    for role_data in template_data.roles:
        role = TemplateRole(
            template_id=template.id,
            role_name=role_data.role_name,
            fte_allocation=role_data.fte_allocation,
            start_offset=role_data.start_offset,
            duration=role_data.duration
        )
        db.add(role)
    
    db.commit()
    db.refresh(template)
    return template

@router.put("/{template_id}", response_model=ProjectTemplateResponse)
async def update_template(
    template_id: int,
    template_data: ProjectTemplateUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update an existing project template."""
    template = db.query(ProjectTemplate).filter(ProjectTemplate.id == template_id).first()
    
    if not template:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Template not found"
        )
    
    # Check ownership
    if template.created_by != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Can only update your own templates"
        )
    
    # Update template fields
    for field, value in template_data.model_dump(exclude_unset=True).items():
        if field not in ['milestones', 'roles']:
            setattr(template, field, value)
    
    # Update milestones if provided
    if template_data.milestones is not None:
        # Remove existing milestones
        db.query(TemplateMilestone).filter(
            TemplateMilestone.template_id == template_id
        ).delete()
        
        # Add new milestones
        for milestone_data in template_data.milestones:
            milestone = TemplateMilestone(
                template_id=template.id,
                name=milestone_data.name,
                description=milestone_data.description,
                duration_offset=milestone_data.duration_offset,
                dependencies=milestone_data.dependencies or []
            )
            db.add(milestone)
    
    # Update roles if provided
    if template_data.roles is not None:
        # Remove existing roles
        db.query(TemplateRole).filter(
            TemplateRole.template_id == template_id
        ).delete()
        
        # Add new roles
        for role_data in template_data.roles:
            role = TemplateRole(
                template_id=template.id,
                role_name=role_data.role_name,
                fte_allocation=role_data.fte_allocation,
                start_offset=role_data.start_offset,
                duration=role_data.duration
            )
            db.add(role)
    
    db.commit()
    db.refresh(template)
    return template

@router.delete("/{template_id}")
async def delete_template(
    template_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete a project template."""
    template = db.query(ProjectTemplate).filter(ProjectTemplate.id == template_id).first()
    
    if not template:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Template not found"
        )
    
    # Check ownership
    if template.created_by != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Can only delete your own templates"
        )
    
    db.delete(template)
    db.commit()
    
    return {"message": "Template deleted successfully"}

@router.post("/{template_id}/use", response_model=dict)
async def use_template(
    template_id: int,
    project_data: dict,  # Basic project info like name, client_id, etc.
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new project based on a template."""
    template = db.query(ProjectTemplate).filter(ProjectTemplate.id == template_id).first()
    
    if not template:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Template not found"
        )
    
    # Check access permissions
    if not template.is_public and template.created_by != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied to private template"
        )
    
    # Create project from template
    milestone_service = MilestoneService(db)
    project = milestone_service.create_project_from_template(
        template_id=template_id,
        project_data=project_data,
        created_by=current_user.id
    )
    
    # Increment usage count
    template.usage_count += 1
    db.commit()
    
    return {
        "message": "Project created from template successfully",
        "project_id": project.id,
        "template_id": template_id
    }

@router.get("/{template_id}/preview", response_model=dict)
async def preview_template(
    template_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Preview what a project would look like when created from this template."""
    template = db.query(ProjectTemplate).filter(ProjectTemplate.id == template_id).first()
    
    if not template:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Template not found"
        )
    
    # Check access permissions
    if not template.is_public and template.created_by != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied to private template"
        )
    
    # Generate preview data
    milestone_service = MilestoneService(db)
    preview = milestone_service.preview_template(template_id)
    
    return preview

@router.get("/categories/list", response_model=List[str])
async def get_template_categories(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get list of available template categories."""
    categories = db.query(ProjectTemplate.category).distinct().all()
    return [cat[0] for cat in categories if cat[0]]

@router.post("/{template_id}/clone", response_model=ProjectTemplateResponse)
async def clone_template(
    template_id: int,
    clone_data: dict,  # name, is_public, etc.
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Clone an existing template."""
    original_template = db.query(ProjectTemplate).filter(
        ProjectTemplate.id == template_id
    ).first()
    
    if not original_template:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Template not found"
        )
    
    # Check access permissions
    if not original_template.is_public and original_template.created_by != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied to private template"
        )
    
    # Create cloned template
    cloned_template = ProjectTemplate(
        name=clone_data.get('name', f"{original_template.name} (Copy)"),
        description=original_template.description,
        category=original_template.category,
        estimated_duration=original_template.estimated_duration,
        complexity=original_template.complexity,
        tags=original_template.tags.copy() if original_template.tags else [],
        is_public=clone_data.get('is_public', False),
        created_by=current_user.id
    )
    
    db.add(cloned_template)
    db.flush()
    
    # Clone milestones
    for milestone in original_template.milestones:
        cloned_milestone = TemplateMilestone(
            template_id=cloned_template.id,
            name=milestone.name,
            description=milestone.description,
            duration_offset=milestone.duration_offset,
            dependencies=milestone.dependencies.copy() if milestone.dependencies else []
        )
        db.add(cloned_milestone)
    
    # Clone roles
    for role in original_template.roles:
        cloned_role = TemplateRole(
            template_id=cloned_template.id,
            role_name=role.role_name,
            fte_allocation=role.fte_allocation,
            start_offset=role.start_offset,
            duration=role.duration
        )
        db.add(cloned_role)
    
    db.commit()
    db.refresh(cloned_template)
    return cloned_template
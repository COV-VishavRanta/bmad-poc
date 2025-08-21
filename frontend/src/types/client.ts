// Client management types and interfaces

export type ClientStatus = 'active' | 'inactive';
export type ClientRelationType = 'Customer' | 'Partner' | 'Internal';
export type ClientSortBy = 'name' | 'created_at' | 'updated_at';
export type SortOrder = 'asc' | 'desc';

export interface Client {
  id: number;
  name: string;
  status: ClientStatus;
  relationType: ClientRelationType;
  projectManagementTool?: string;
  comments?: string;
  projectCount: number;
  createdAt: string;
  updatedAt: string;
  lastActivity: string;
}

export interface ClientTableRow extends Client {
  // Display-specific computed properties
  formattedCreatedAt?: string;
  formattedUpdatedAt?: string;
}

export interface ClientSearchParams {
  search?: string;
  status?: ClientStatus | 'all';
  relationType?: ClientRelationType | 'all';
  page?: number;
  pageSize?: number;
  sortBy?: ClientSortBy;
  sortOrder?: SortOrder;
  dateFrom?: string;
  dateTo?: string;
}

export interface CreateClientData {
  name: string;
  status: ClientStatus;
  relationType: ClientRelationType;
  projectManagementTool?: string;
  comments?: string;
}

export interface UpdateClientData extends CreateClientData {
  // Update-specific metadata
  reason?: string; // Reason for the update
}

export interface ClientDependency {
  type: 'project' | 'assignment' | 'sow';
  id: number;
  name: string;
  status: string;
}

export interface ClientHistory {
  id: number;
  clientId: number;
  action: string;
  field?: string;
  oldValue?: string;
  newValue?: string;
  userId: number;
  userName: string;
  timestamp: string;
  reason?: string;
}

export interface ClientListResponse {
  clients: Client[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface ClientSearchResponse extends ClientListResponse {
  // Search-specific metadata
  searchTerm?: string;
  searchTime?: number; // Time taken for search in milliseconds
}
export type Status = 'Available' | 'On_Loan' | 'Under_Maintenance' | 'Retired';

export interface Asset {
  id: string;
  type: string;
  status: Status;
}

export type StatusCounts = Record<Status, number>;

export function countByType(assets: Asset[]): Record<string, StatusCounts> {
  const result: Record<string, StatusCounts> = {};
  for (const asset of assets) {
    result[asset.type] ??= { Available: 0, On_Loan: 0, Under_Maintenance: 0, Retired: 0 };
    result[asset.type][asset.status] += 1;
  }
  return result;
}
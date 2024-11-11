import { Admin } from "../admin/Admin";

export interface Admins {
  any(): Promise<Admin>;
}

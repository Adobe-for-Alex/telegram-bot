import Admin from "../admin/Admin";

export default interface Admins {
  any(): Promise<Admin>;
}

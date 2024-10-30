import Admin from "../admin/Admin";

export default interface Admins {
  anyNotBusy(): Promise<Admin>
}


import Admin from "../admin/Admin";

interface Admins {
  anyNotBusy(): Promise<Admin>
}

export default Admins;
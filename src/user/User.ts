import { UserId } from "../aliases";
import Subscrption from "../subscription/Subscrption";

export default interface User {
  id(): Promise<UserId>;
  isAdmin(): Promise<boolean>;
  subscrption(): Promise<Subscrption | undefined>;
}

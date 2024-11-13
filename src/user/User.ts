import { UserId } from "../aliases";
import Subscrption from "../subscription/Subscrption";

export default interface User {
  id(): Promise<UserId>;
  subscrption(): Promise<Subscrption | undefined>;
}

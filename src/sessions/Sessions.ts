import { SessionId } from "../aliases";
import Session from "../session/Session";

export default interface Sessions {
  withId(id: SessionId): Promise<Session>
}

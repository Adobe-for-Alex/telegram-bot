import { SessionId, UserId } from "../aliases";
import Session from "../session/Session";

export default interface Sessions {
  withId(id: SessionId): Promise<Session | undefined>
  forUser(id: UserId): Promise<Session>
}

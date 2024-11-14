import User from "../user/User"

export default interface Session {
  user(): Promise<User>
  delete(): Promise<void>
}

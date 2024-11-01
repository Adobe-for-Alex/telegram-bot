import Account from "../account/Account"

export default interface Session {
  account(): Promise<Account>
  updateAccount(account: Account): Promise<void>
  expired(): Promise<Date>
  extendTo(date: Date): Promise<void>
}

export default interface Account {
  email(): Promise<string>
  password(): Promise<string>
}

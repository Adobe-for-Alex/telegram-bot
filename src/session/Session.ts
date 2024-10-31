export default interface Session {
  email(): Promise<string>;
  password(): Promise<string>;
  expired(): Promise<Date>;
  extendTo(date: Date): Promise<void>
}
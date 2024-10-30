export default interface Price {
  amount(): Promise<number>;
}

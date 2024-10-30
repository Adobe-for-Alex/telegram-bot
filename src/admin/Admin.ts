import Payment from "../payment/Payment";

export default interface Admin {
  approve(payment: Payment): Promise<Payment>
}


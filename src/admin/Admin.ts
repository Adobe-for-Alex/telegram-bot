import Payment from "../payment/Payment";

interface Admin {
    approve(payment: Payment): Promise<Payment>
}

export default Admin;
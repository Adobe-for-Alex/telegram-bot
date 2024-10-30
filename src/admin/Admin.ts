interface Admin {
    approve(payment: Payment): Promise<Payment>
}
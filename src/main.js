export default async ({ req, res, log, error }) => {
  // 1. Ambil data dari request Flutter
  const payload = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  const { orderId, grossAmount, itemName } = payload;

  const serverKey = process.env.MIDTRANS_SERVER_KEY;
  const authString = Buffer.from(`${serverKey}:`).toString('base64');

  // 2. Siapkan parameter untuk Midtrans Snap
  const midtransParams = {
    transaction_details: {
      order_id: orderId,
      gross_amount: grossAmount,
    },
    item_details: [{
      id: "ITEM01",
      price: grossAmount,
      quantity: 1,
      name: itemName
    }]
  };

  try {
    // 3. Request ke Midtrans (Gunakan https://app.midtrans.com/ untuk Production)
    const response = await fetch('https://app.sandbox.midtrans.com/snap/v1/transactions', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': `Basic ${authString}`
      },
      body: JSON.stringify(midtransParams)
    });

    const data = await response.json();

    // 4. Kembalikan redirect_url ke Flutter
  
    if (data.redirect_url) {
  return res.json({
    success: true,
    redirect_url: data.redirect_url,
    token: data.token
  });
} else {
  return res.json({
    success: false,
    message: 'Midtrans tidak memberikan URL',
    raw: data // kirim data mentah untuk cek error dari midtrans
  });
}

  } catch (err) {
    error(err.message);
    return res.json({ success: false, message: 'Gagal membuat transaksi' }, 500);
  }
};

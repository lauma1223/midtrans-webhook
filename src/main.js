export default async ({ req, res, log, error }) => {
  if (req.method !== 'POST') {
    return res.json({ success: false, message: 'Method tidak diizinkan' }, 405);
  }

  const payload = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  
  // Ambil orderId, grossAmount, dan daftar items dari Flutter
  const { orderId, grossAmount, items } = payload;

  const serverKey = process.env.MIDTRANS_SERVER_KEY;
  const authString = Buffer.from(`${serverKey}:`).toString('base64');

  // Validasi awal memastikan items ada
  if (!items || items.length === 0) {
    return res.json({ success: false, message: 'Keranjang belanja (items) tidak boleh kosong' }, 400);
  }

  // Format ulang items dari Flutter agar sesuai dengan struktur Midtrans
  const midtransItems = items.map(item => ({
    id: item.id || `ITEM-${Math.random().toString(36).substr(2, 5)}`,
    price: parseInt(item.price),
    quantity: parseInt(item.quantity),
    name: item.name.substring(0, 50) // Midtrans membatasi nama maksimal 50 karakter
  }));

  // Hitung ulang total item_details untuk memastikan kecocokan dengan gross_amount
  const totalItemsPrice = midtransItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  if (totalItemsPrice !== parseInt(grossAmount)) {
    error(`Mismatch harga! grossAmount: ${grossAmount}, Total hitung item: ${totalItemsPrice}`);
    return res.json({ 
      success: false, 
      message: `Total harga tidak cocok dengan rincian barang. Gross: ${grossAmount}, Items Total: ${totalItemsPrice}` 
    }, 400);
  }

  const midtransParams = {
    transaction_details: {
      order_id: orderId,
      gross_amount: parseInt(grossAmount),
    },
    item_details: midtransItems
  };

  try {
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
    log(JSON.stringify(data)); 

    if (data.redirect_url) {
      return res.json({
        success: true,
        redirect_url: data.redirect_url,
        token: data.token
      });
    } else {
      return res.json({ success: false, message: 'Midtrans gagal membuat URL', raw: data });
    }

  } catch (err) {
    error(err.message);
    return res.json({ success: false, message: 'Gagal menghubungi Midtrans' }, 500);
  }
};

const express = require('express');
const app = express();
app.use(express.json());

let products = [
  { id: 1, name: 'Laptop', price: 999 },
  { id: 2, name: 'Phone', price: 699 }
];


app.get('/products', (req, res) => res.json(products));
app.get('/products/:id', (req, res) => {
  const product = products.find(p => p.id === parseInt(req.params.id));
  res.json(product || { error: 'Not found' });
});
app.post('/products', (req, res) => {
  const product = req.body;
  products.push(product);
  res.json(product);
});

app.listen(3001, () => console.log('Product Service running on 3001'));
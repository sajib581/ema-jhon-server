const express = require('express')
const bodyParser = require('body-parser');
const cors = require('cors')
const cloudinary = require('cloudinary').v2;
require('dotenv').config()

cloudinary.config({
  cloud_name: 'dy3odhvvh',
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_SECRET_KEY
});

const MongoClient = require('mongodb').MongoClient;
const fileUpload = require('express-fileupload');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.4ft4b.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;

const app = express()
app.use(bodyParser.json());
// app.use(express.json());  it can be used instead of bodyParse.json()

app.use(cors())
app.use(fileUpload({
  useTempFiles: true   //it must be used
}))

const port = process.env.PORT || 4000 

app.get('/', (req, res) => {
  res.send('Hello Boss!')
})

const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });
client.connect(err => {
  const productsCollection = client.db(process.env.DB_NAME).collection("products");
  const orderCollection = client.db(process.env.DB_NAME).collection("orders");

  app.post('/addSomeProduct', (req, res) => {
    const products = req.body
    productsCollection.insertMany(products)
      .then(result => {
        res.send(result.insertedCount > 0)
      })
  })

  app.post('/addAProduct', (req, res) => {
    let file;
    if (req.files) {
      file = req.files.file
    }

    const { name, seller, price, stock, key, star, features } = req.body;
    const productFeatures = JSON.parse(features)
    const productData = { name, seller, price, stock, key, star, features: productFeatures }
    if (file) {
      cloudinary.uploader.upload(file.tempFilePath, function (error, result) {
        if (!error) {
          productData.img = result.url;
          productsCollection.insertOne(productData)
            .then(result => {
              res.send(result.insertedCount > 0)
            })
        }
      })
    }
    else {
      productData.img = "https://sloanreview.mit.edu/content/uploads/2017/08/MAG-FR-Oestreicher-Singer-Product-Recommendation-Viral-Marketing-Social-Media-Network-Ecommerce-1200-300x300.jpg";
      productsCollection.insertOne(productData)
        .then(result => {
          res.send(result.insertedCount > 0)
        })
    }
  })

  app.get('/getAllPrpoducts', (req, res) => {
    productsCollection.find({}).sort({ _id: -1 })
      .toArray((err, document) => {
        res.send(document)
      })
  })

  app.get('/search',(req, res) => {
    const filter = req.query.filter ;
    productsCollection.find({name: {$regex: filter}})
    .toArray((err, document) => {
      res.send(document)
    })
  })

  app.get('/product/:key', (req, res) => {
    const key = req.params.key
    productsCollection.find({ key: key })
      .toArray((err, document) => {
        res.send(document)
      })
  })

  app.post('/productsByKeys', (req, res) => {
    const productKeys = req.body;
    productsCollection.find({ key: { $in: productKeys } })
      .toArray((err, document) => {
        res.send(document)
      })
  })

  app.post('/addAOrder', (req, res) => {
    const order = req.body
    orderCollection.insertOne(order)
      .then(result => {
        res.send(result.insertedCount > 0)
      })
  })

  if (!err) {
    console.log("database Connected Successfully");
  }
});


app.listen(port, () => {
  console.log(`Server is running on port: ${port}`)
})
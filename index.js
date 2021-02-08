const { cloudinary } = require("./utils/cloudinary");
const express=require("express");
require("dotenv").config();
const admin = require("firebase-admin");
const MongoClient = require("mongodb").MongoClient;
const bodyParser = require("body-parser");
const cors = require("cors");
const ObjectId = require("mongodb").ObjectId;

const app = express();

app.use(express.static("public"));
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cors());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.ugsfy.mongodb.net/${process.env.DB_NAME}?retryWrites=true&w=majority`;

var serviceAccount = require("./privateKey/privatekey.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://project-test-me.firebaseio.com",
});

app.post("/api/upload", async (req, res) => {
  try {
    const fileStr = req.body.data;
    const uploadResponse = await cloudinary.uploader.upload(fileStr, {
      upload_preset: "e_commerce_img",
      width: 180,
      height: 260,
    });
    res.json({ url: `${uploadResponse.url}` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ err: "Something went wrong" });
  }
});

const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });
client.connect((err) => {
  const productCollection = client.db(process.env.DB_NAME).collection(process.env.DB_CTN);
  const cartCollection = client.db(process.env.DB_NAME).collection(process.env.DB_CTN_CART);
  const checkoutCollection = client.db(process.env.DB_NAME).collection(process.env.DB_CTN_CHECKOUT);
  const promoCodeCollection = client.db(process.env.DB_NAME).collection(process.env.DB_PROMO_CODE);

  console.log("database connect");

  app.post("/addProducts", (req, res) => {
    productCollection.insertOne(req.body).then((result) => {
      res.send(result.insertedCount > 0);
    });
  });

  app.get("/allProducts", (req, res) => {
    const bearerToken = req.headers.authorization;
    if (bearerToken && bearerToken.startsWith("Bearer ")) {
      const idToken = bearerToken.split(" ")[1];
      // idToken comes from the client app
      admin
        .auth()
        .verifyIdToken(idToken)
        .then(function (decodedToken) {
          productCollection.find({}).toArray((err, documents) => {
            res.send(documents);
          });
        })
        .catch(function (error) {
          res.send("un-authorized access");
        });
    } else {
      res.send("un-authorized access");
    }
  });

  app.patch("/updateProduct/:id", (req, res) => {
    const updatePd = req.body.updateInfo;
    productCollection
      .updateOne(
        { _id: ObjectId(req.params.id) },
        {
          $set: updatePd,
        }
      )
      .then((result) => {
        res.send(result.modifiedCount > 0);
      });
  });

  app.get("/seeProducts/:active", (req, res) => {
    const reviewProducts = req.params.active;
    productCollection.find({ active: reviewProducts }).toArray((err, documents) => {
      res.send(documents);
    });
  });

  app.get("/searchProduct", (req, res) => {
    const searchProducts = req.query.search;
    productCollection.find({ pdName: { $regex: searchProducts } }).toArray((err, result) => {
      res.send(result);
    });
  });

  app.post("/addToCart", (req, res) => {
    const orders = req.body;
    cartCollection.insertOne(orders).then((result) => {
      res.send(result.insertedCount > 0);
    });
  });

  app.get("/cartLength", (req, res) => {
    cartCollection.find({}).toArray((err, documents) => {
      res.send(documents);
    });
  });

  app.get("/allCartItems", (req, res) => {
    cartCollection.find({}).toArray((err, documents) => {
      res.send(documents);
    });
  });

  app.delete("/delete/:Id", (req, res) => {
    cartCollection.deleteOne({ _id: req.params.Id }).then((result) => {
      res.send(result);
    });
  });

  app.delete("/deleteAll/", (req, res) => {
    cartCollection.deleteMany().then((result) => {
      res.send(result.deletedCount > 0);
    });
  });

  app.post("/checkout", (req, res) => {
    const totalPrice = req.body;
    checkoutCollection.insertOne(totalPrice).then((result) => {
      res.send(result.insertedCount > 0);
    });
  });

  app.get("/allOrders", (req, res) => {
    const orderToken = req.headers.authorization;
    if (orderToken && orderToken.startsWith("Bearer ")) {
      const idToken = orderToken.split(" ")[1];
      // idToken comes from the client app
      admin
        .auth()
        .verifyIdToken(idToken)
        .then(function (decodedToken) {
          checkoutCollection.find({}).toArray((err, documents) => {
            res.send(documents);
          });
        })
        .catch(function (error) {
          res.send("un-authorized access");
        });
    } else {
      res.send("un-authorized access");
    }
  });

  app.patch("/updateStatus/:id", (req, res) => {
    const status = req.body.newInfo.status;
    checkoutCollection
      .updateOne(
        { _id: ObjectId(req.params.id) },
        {
          $set: { status: status },
        }
      )
      .then((result) => {
        res.send(result.modifiedCount > 0);
      });
  });

  app.post("/addPromoCode", (req, res) => {
    const code = req.body;
    promoCodeCollection.insertOne(code).then((result) => {
      res.send(result.insertedCount > 0);
    });
  });

  app.get("/SeePromoCode", (req, res) => {
    const codeToken = req.headers.authorization;
    if (codeToken && codeToken.startsWith("Bearer ")) {
      const idToken = codeToken.split(" ")[1];
      // idToken comes from the client app
      admin
        .auth()
        .verifyIdToken(idToken)
        .then(function (decodedToken) {
          let uid = decodedToken.uid;
          if (uid) {
            promoCodeCollection.find({}).toArray((err, documents) => {
              res.send(documents);
            });
          } else {
            res.send("un-authorized access");
          }
        })
        .catch(function (error) {
          res.send("un-authorized access");
        });
    } else {
      res.send("un-authorized access");
    }
  });

  app.patch("/updatePromo/:id", (req, res) => {
    const updatePromo = req.body.updateInfo;
    promoCodeCollection
      .updateOne(
        { _id: ObjectId(req.params.id) },
        {
          $set: updatePromo,
        }
      )
      .then((result) => {
        res.send(result.modifiedCount > 0);
      });
  });

  app.get("/applyPromoCode", (req, res) => {
    promoCodeCollection.find({}).toArray((err, documents) => {
      res.send(documents);
    });
  });

});

app.get("/", (req, res) => {
  res.send("Hello World,,connect my server");
});

app.listen(process.env.PORT || 5000);

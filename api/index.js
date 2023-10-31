const express = require('express');
const cors = require('cors');
const mongoose = require("mongoose");
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('./models/User.js');
const Place = require('./models/Place.js');
const Booking = require('./models/Booking.js');
const cookieParser = require('cookie-parser');


require('dotenv').config();
const app = express();

const bcryptSalt = bcrypt.genSaltSync(10);
const jwtSecret = process.env.SECRET_KEY;



PORT = process.env.PORT;

app.use(express.json());
app.use(cookieParser());
app.use('/uploads', express.static(__dirname+'/uploads'));
app.use(cors({
  credentials: true,
  origin: 'http://127.0.0.1:5173',
}));


mongoose.connect(process.env.MONGO_URI, {useNewUrlParser:true, useUnifiedTopology:true})


  function getUserDataFromReq(req) {
    return new Promise((resolve, reject) => {
      jwt.verify(req.cookies.token, jwtSecret, {}, async (err, userData) => {
        if (err) throw err;
        resolve(userData);
      });
    });
  }

app.get('/test', (req,res)=>{
    res.status(200).json({success:true})
})

app.post('/register', async (req,res)=>{
    try {
        const {name, email, password} = req.body;
        const user = await User.create({
            name,
            email,
            password: bcrypt.hashSync(password, bcryptSalt)
        })

        res.json(user)
        
    } catch (error) {
        res.status(500).json({success:false, message:error.message})//status:422- unprocessable entity(e)
        
    }
})

app.post('/login', async (req,res)=>{
    const {email, password} = req.body;
    const user = User.findOne({email});
    //if user doesn't exist in database throw error
    if(!user){
        res.status(422).json({success:false, message:'Invalid credentials'})
    }
    //if user exists, check if password is correct
    if(bcrypt.compareSync(password, user.password)){
        jwt.sign({email:user.email, id:user._id}, process.env.SECRET_KEY, {}, (err, token)=>{
            if(err){
                res.status(500).json({success:false, message:'Error signing token'})
            }
            res.cookie('token', token).json(user)
        })
}   else {
        res.status(422).json({success:false, message:'Invalid credentials'})
    }

})

app.get('/api/profile', (req,res) => {
    mongoose.connect(process.env.MONGO_URI);
    const {token} = req.cookies;
    if (token) {
      jwt.verify(token, process.env.SECRET_KEY, {}, async (err, userData) => {
        if (err) throw err;
        const {name,email,_id} = await User.findById(userData.id);
        res.json({name,email,_id});
      });
    } else {
      res.json(null);
    }
  });


  app.post('/logout', (req,res)=>{
    res.cookie('token', '').json(true);
  })

  
  app.post('/api/places', (req,res) => {
    mongoose.connect(process.env.MONGO_URI);
    const {token} = req.cookies;
    const {
      title,address,addedPhotos,description,price,
      perks,extraInfo,checkIn,checkOut,maxGuests,
    } = req.body;
    jwt.verify(token, jwtSecret, {}, async (err, userData) => {
      if (err) throw err;
      const placeDoc = await Place.create({
        owner:userData.id,price,
        title,address,photos:addedPhotos,description,
        perks,extraInfo,checkIn,checkOut,maxGuests,
      });
      res.json(placeDoc);
    });
  });
  
  app.get('/api/user-places', (req,res) => {
    mongoose.connect(process.env.MONGO_URI);
    const {token} = req.cookies;
    jwt.verify(token, jwtSecret, {}, async (err, userData) => {
      const {id} = userData;
      res.json( await Place.find({owner:id}) );
    });
  });
  
  app.get('/api/places/:id', async (req,res) => {
    mongoose.connect(process.env.MONGO_URI);
    const {id} = req.params;
    res.json(await Place.findById(id));
  });
  
  app.put('/api/places', async (req,res) => {
    mongoose.connect(process.env.MONGO_URI);
    const {token} = req.cookies;
    const {
      id, title,address,addedPhotos,description,
      perks,extraInfo,checkIn,checkOut,maxGuests,price,
    } = req.body;
    jwt.verify(token, jwtSecret, {}, async (err, userData) => {
      if (err) throw err;
      const placeDoc = await Place.findById(id);
      if (userData.id === placeDoc.owner.toString()) {
        placeDoc.set({
          title,address,photos:addedPhotos,description,
          perks,extraInfo,checkIn,checkOut,maxGuests,price,
        });
        await placeDoc.save();
        res.json('ok');
      }
    });
  });
  
  app.get('/api/places', async (req,res) => {
    mongoose.connect(process.env.MONGO_URI);
    res.json( await Place.find() );
  });
  
  app.post('/api/bookings', async (req, res) => {
    mongoose.connect(process.env.MONGO_URI);
    const userData = await getUserDataFromReq(req);
    const {
      place,checkIn,checkOut,numberOfGuests,name,phone,price,
    } = req.body;
    Booking.create({
      place,checkIn,checkOut,numberOfGuests,name,phone,price,
      user:userData.id,
    }).then((doc) => {
      res.json(doc);
    }).catch((err) => {
      throw err;
    });
  });
  
  
  
  app.get('/api/bookings', async (req,res) => {
    mongoose.connect(process.env.MONGO_URI);
    const userData = await getUserDataFromReq(req);
    res.json( await Booking.find({user:userData.id}).populate('place') );
  });
  
app.listen(PORT,()=>{
    console.log(`Server listening on port ${PORT} ....`);

})
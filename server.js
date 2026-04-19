require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const multer = require("multer");

const app = express();
const SECRET = "secretkey";

/* ===== MIDDLEWARE ===== */
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));

/* ===== DATABASE ===== */
mongoose.connect(process.env.MONGO_URI)
.then(()=>console.log("MongoDB Connected"))
.catch(err=>console.log(err));

/* ===== MULTER ===== */
const storage = multer.diskStorage({
    destination:(req,file,cb)=>cb(null,"public/uploads"),
    filename:(req,file,cb)=>cb(null,Date.now()+"-"+file.originalname)
});
const upload = multer({storage});

/* ===== SCHEMAS ===== */
const userSchema = new mongoose.Schema({
    email:String,
    password:String,

    cart:[{
        productId:String,
        name:String,
        price:Number,
        image:String,
        quantity:Number
    }],

    wishlist:[{
        productId:String,
        name:String,
        price:Number,
        image:String
    }],

    orders:[{
        items:Array,
        total:Number,
        date:Date,
        status:{type:String,default:"Placed"},
        timeline:[{
            status:String,
            time:Date
        }]
    }],

    notifications:[{
        message:String,
        time:Date,
        read:{type:Boolean,default:false}
    }]
});

const productSchema = new mongoose.Schema({
    name:String,
    price:Number,
    description:String,
    image:String,

    reviews:[{
        user:String,
        rating:Number,
        comment:String
    }]
});

const chatSchema = new mongoose.Schema({
    userId:String,
    message:String,
    sender:String,
    time:Date
});

const User = mongoose.model("User",userSchema);
const Product = mongoose.model("Product",productSchema);
const Chat = mongoose.model("Chat",chatSchema);

/* ===== AUTH ===== */
function isAuth(req,res,next){
    const token = req.headers.authorization;
    if(!token) return res.status(401).json({message:"No token"});

    try{
        const data = jwt.verify(token,SECRET);
        req.userId = data.id;
        next();
    }catch{
        res.status(401).json({message:"Invalid token"});
    }
}

/* ===== REGISTER ===== */
app.post("/register", async(req,res)=>{
    const hash = await bcrypt.hash(req.body.password,10);
    await User.create({email:req.body.email,password:hash});
    res.json({message:"Registered"});
});

/* ===== LOGIN ===== */
app.post("/login", async(req,res)=>{
    const user = await User.findOne({email:req.body.email});
    if(!user) return res.json({message:"User not found"});

    const match = await bcrypt.compare(req.body.password,user.password);
    if(!match) return res.json({message:"Wrong password"});

    const token = jwt.sign({id:user._id},SECRET);
    res.json({token});
});

/* ===== PRODUCTS + AVG RATING ===== */
app.get("/api/products", async(req,res)=>{
    const products = await Product.find();

    const updated = products.map(p=>{
        let avg = 0;
        if(p.reviews.length){
            avg = p.reviews.reduce((s,r)=>s+r.rating,0)/p.reviews.length;
        }

        return {
            ...p._doc,
            avgRating: avg.toFixed(1)
        };
    });

    res.json(updated);
});

/* ===== ADD PRODUCT ===== */
app.post("/admin/add-product", upload.single("image"), async(req,res)=>{
    await Product.create({
        name:req.body.name,
        price:req.body.price,
        description:req.body.description,
        image:req.file ? req.file.filename : ""
    });
    res.json({message:"Product Added"});
});

/* ===== CART ===== */
app.post("/api/add-to-cart", isAuth, async(req,res)=>{
    const user = await User.findById(req.userId);

    const exist = user.cart.find(i=>i.productId===req.body.productId);

    if(exist) exist.quantity++;
    else user.cart.push({
        productId:req.body.productId,
        name:req.body.name,
        price:req.body.price,
        image:req.body.image,
        quantity:1
    });

    await user.save();
    res.json({message:"Added"});
});

app.get("/api/cart", isAuth, async(req,res)=>{
    const user = await User.findById(req.userId);
    res.json(user.cart);
});

app.post("/api/update-qty", isAuth, async(req,res)=>{
    const user = await User.findById(req.userId);

    const item = user.cart.find(i=>i.productId===req.body.productId);

    if(item){
        item.quantity += req.body.change;

        if(item.quantity<=0){
            user.cart = user.cart.filter(i=>i.productId!==req.body.productId);
        }
    }

    await user.save();
    res.json({message:"Updated"});
});

app.get("/api/cart-count", isAuth, async(req,res)=>{
    const user = await User.findById(req.userId);
    const count = user.cart.reduce((s,i)=>s+i.quantity,0);
    res.json({count});
});

/* ===== WISHLIST ===== */
app.post("/api/wishlist", isAuth, async(req,res)=>{
    const user = await User.findById(req.userId);

    const exist = user.wishlist.find(i=>i.productId===req.body.productId);

    if(!exist){
        user.wishlist.push({
            productId:req.body.productId,
            name:req.body.name,
            price:req.body.price,
            image:req.body.image
        });
    }

    await user.save();
    res.json({message:"Added"});
});

app.get("/api/wishlist", isAuth, async(req,res)=>{
    const user = await User.findById(req.userId);
    res.json(user.wishlist);
});

app.get("/api/wishlist-count", isAuth, async(req,res)=>{
    const user = await User.findById(req.userId);
    res.json({count:user.wishlist.length});
});
app.post("/api/remove-wishlist", isAuth, async(req,res)=>{
    const user = await User.findById(req.userId);

    user.wishlist = user.wishlist.filter(
        i => i.productId !== req.body.productId
    );

    await user.save();

    res.json({message:"Removed"});
});

/* ===== ORDERS ===== */
app.post("/api/place-order", isAuth, async(req,res)=>{
    const user = await User.findById(req.userId);

    const total = user.cart.reduce((s,i)=>s+i.price*i.quantity,0);

    user.orders.push({
        items:user.cart,
        total,
        date:new Date(),
        status:"Placed",
        timeline:[{status:"Placed",time:new Date()}]
    });

    user.cart=[];

    user.notifications.push({
        message:"🟡 Order Placed",
        time:new Date()
    });

    await user.save();
    res.json({message:"Order placed"});
});

app.get("/api/orders", isAuth, async(req,res)=>{
    const user = await User.findById(req.userId);
    res.json(user.orders);
});

/* ===== AUTO STATUS ===== */
setInterval(async ()=>{
    const users = await User.find();

    for(const user of users){
        user.orders.forEach(o=>{
            const diff=(Date.now()-new Date(o.date))/1000;

            if(diff>5 && o.status==="Placed"){
                o.status="Packed";
                o.timeline.push({status:"Packed",time:new Date()});
            }

            if(diff>10 && o.status==="Packed"){
                o.status="Shipped";
                o.timeline.push({status:"Shipped",time:new Date()});
            }

            if(diff>15 && o.status==="Shipped"){
                o.status="Delivered";
                o.timeline.push({status:"Delivered",time:new Date()});
            }
        });

        await user.save();
    }
},5000);

/* ===== NOTIFICATIONS ===== */
app.get("/api/notifications", isAuth, async(req,res)=>{
    const user = await User.findById(req.userId);
    res.json(user.notifications.reverse());
});

/* ===== CHAT ===== */
app.post("/api/chat", isAuth, async(req,res)=>{
    await Chat.create({
        userId:req.userId,
        message:req.body.message,
        sender:"user",
        time:new Date()
    });
    res.json({message:"Sent"});
});

app.get("/api/chat", isAuth, async(req,res)=>{
    res.json(await Chat.find({userId:req.userId}));
});

/* ===== REVIEWS ===== */
app.post("/api/add-review", isAuth, async(req,res)=>{
    const user = await User.findById(req.userId);

    const bought = user.orders.some(o =>
        o.items.some(i=>i.productId===req.body.productId)
    );

    if(!bought) return res.json({message:"Buy first"});

    const product = await Product.findById(req.body.productId);

    product.reviews.push({
        user:user.email,
        rating:req.body.rating,
        comment:req.body.comment
    });

    await product.save();
    res.json({message:"Review added"});
});
app.post("/api/cancel-order", isAuth, async(req,res)=>{

    const user = await User.findById(req.userId);

    console.log("Incoming ID:", req.body.id); // DEBUG

    let found = false;

    user.orders.forEach(order=>{
        if(order._id.toString() === req.body.id){

            found = true;

            if(order.status === "Delivered"){
                return res.json({message:"Cannot cancel delivered"});
            }

            order.status = "Cancelled";

            order.timeline.push({
                status:"Cancelled",
                time:new Date()
            });
        }
    });

    if(!found){
        return res.json({message:"Order not found ❌"});
    }

    await user.save();

    res.json({message:"Order Cancelled ✅"});
});

/* ===== SERVER ===== */
const PORT = process.env.PORT || 3000;
app.listen(PORT,()=>console.log("🚀 Server running on http://localhost:3000"));
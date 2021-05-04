
const express=require('express')
const router=express.Router();
const User=require('../models/user')
const bcrypt=require('bcrypt')
const passport=require('passport')
const guest=require('../middlewares/guest')
const Order=require('../models/order')
const Auth=require('../middlewares/auth')
const moment=require('moment')

router.get('/login',guest,(req,res)=>{
    res.render('auth/login')
})

router.post('/login',guest,async (req,res,next)=>{
    
    const { email, password }   = req.body
     if(!email || !password) {
         req.flash('error', 'All fields are required')
         return res.redirect('/user/login')
     }

    passport.authenticate('local',(err,user,info)=>{

        if(err){
            req.flash('error',info.message)
            return next(err)
        }

        if(!user){
            req.flash('error',info.message)
            return res.redirect('/user/login')
        }

        req.logIn(user,err=>{

            if(err){
                req.flash('error','Something went wrong😪')
                return next(err)
            }

            console.log(req.user.role);
            if(req.user.role=='admin'){
                return res.redirect('/admin/orders')
            }
            return res.redirect('/user/orders')
        })

    })(req,res,next)
})

router.post('/logout',Auth,(req,res)=>{
    req.logOut()
    res.redirect('/user/login')
})

router.get('/register',guest,(req,res)=>{
    res.render('auth/register')
})

router.post('/register',guest,async(req,res)=>{
    const {name,email,password}=req.body
    if(!name || !email || !password){
        req.flash('error','All fields are required')
        req.flash('name',name)
        req.flash('email',email)
        return res.redirect('/user/register')
    }

    const user=await User.findOne({email:email})
    if(user){
        req.flash('error','Email already taken')
        req.flash('name',name)
        req.flash('email',email)
        return res.redirect('/user/register')
    }

    const hashedPassword=await bcrypt.hash(password,10)
    const newUser=new User({
        name:name,
        email:email,
        password:hashedPassword
    })

    try{
        await newUser.save()
        return res.redirect('/')
    }
    catch{
        req.flash('error','Something went wrong')
        return res.redirect('/user/register')
    }
})

router.get('/cart',(req,res)=>{
    res.render('auth/cart')
})

router.post('/update-cart',(req,res)=>{
    
    if(!req.session.cart){
        req.session.cart={
            items:{},
            totalQty:0,
            totalPrice:0
        }
    }
    let cart=req.session.cart
    if(!cart.items[req.body._id]){
        cart.items[req.body._id]={
            item:req.body,
            qty:1
        }
        cart.totalQty+=1
        cart.totalPrice+=req.body.price
    }
    else{
        cart.items[req.body._id].qty+=1
        cart.totalQty+=1
        cart.totalPrice+=req.body.price
    }
    res.json({totalQty:req.session.cart.totalQty})
})

router.post('/orders',Auth,async(req,res)=>{

    const {phone,address}=req.body
    if(!phone || !address){
        req.flash('error','All fields are required')
        res.redirect('/user/cart')
    }

    const order=new Order({
        customerId:req.user._id,
        items:req.session.cart.items,
        phone:phone,
        address:address
    })

    try{
        await order.save()
        console.log(order)
        req.flash('success','Order placed successfully')
        delete req.session.cart
        const newOrder=await Order.populate(order,'customerId')
        const eventEmitter = req.app.get('eventEmitter')
        eventEmitter.emit('orderPlaced',newOrder)
        res.redirect('/user/orders')
    }
    catch{
        req.flash('error','Something went wrong')
        return res.redirect('/user/cart')
    }
})

router.get('/orders',Auth,async(req,res)=>{

    const orders=await Order.find({customerId:req.user._id},null,{sort:{'createdAt':-1}})
    res.header('Cache-Control', 'no-store')
    res.render('auth/show_order',{orders:orders,moment:moment})
})

router.get('/order/:id',Auth,async(req,res)=>{
    
    const order=await Order.findById(req.params.id)

    if(req.user._id.toString()===order.customerId.toString()){
        res.render('auth/singleOrder',{order:order})
    }
    else{
        res.redirect('/')
    }
})

module.exports=router
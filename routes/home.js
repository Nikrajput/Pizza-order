
const express=require('express')
const router=express.Router();
const Menu=require('../models/menu')

router.get('/',async(req,res)=>{

    const pizzas=await Menu.find()
    res.render('home',{pizzas:pizzas})
})

module.exports=router
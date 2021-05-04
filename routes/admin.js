
const express=require('express')
const router=express.Router();
const Order=require('../models/order')
const admin=require('../middlewares/admin');


router.get('/orders',admin,async(req,res)=>{

    const orders=await Order.find({status:{$ne:'completed'}},null,{sort:{'createdAt':-1}}).populate('customerId','-password').exec()
    if(req.xhr) {
        return res.json(orders)
    } 
    
    res.render('admin/order')
    
})

router.post('/order/status',admin,async(req,res)=>{
    
    await Order.updateOne({_id:req.body.orderId},{status:req.body.status})
    const eventEmitter = req.app.get('eventEmitter')
    eventEmitter.emit('orderUpdated', { id: req.body.orderId, status: req.body.status })
    res.redirect('/admin/orders')
})

module.exports=router
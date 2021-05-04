require('dotenv').config()
const express=require('express')
const app=express()
const ejs=require('ejs')
const expressLayouts=require('express-ejs-layouts')
const path=require('path')
const session=require('express-session')
const flash=require('express-flash')
const mongoose=require('mongoose')
const MongoStore=require('connect-mongo')
const passport=require('passport')
const homeRoute=require('./routes/home')
const authRoute=require('./routes/auth')
const adminRoute=require('./routes/admin')
const Emitter=require('events')

const connectDB=require('./config/db')
connectDB()

const eventEmitter = new Emitter()
app.set('eventEmitter', eventEmitter)

app.use(express.static('public'))
app.set('views', path.join(__dirname, '/resources/views'))
app.set('view engine', 'ejs')
app.use(expressLayouts)
app.use(express.urlencoded({extended:false}))
app.use(express.json())
app.use(flash())

app.use(session({
    secret:process.env.COOKIE_SECRET,
    resave: false,
    store:MongoStore.create({
        mongoUrl:process.env.DATABASE_URL,
        collectionName:'sessions'
    }),
    saveUninitialized: false,
    cookie: { maxAge: 1000 * 60 * 60 * 24 } // 24 hour
}))

const passportInit=require('./config/passport')
passportInit(passport)
app.use(passport.initialize())
app.use(passport.session())

app.use((req, res, next) => {
    res.locals.session = req.session
    res.locals.user = req.user
    next()
})


app.use('/',homeRoute)
app.use('/user',authRoute)
app.use('/admin',adminRoute)

const server=app.listen(process.env.PORT || 3256)

const io = require('socket.io')(server)

io.on('connection', (socket) => {

      socket.on('join', (roomName) => {
        socket.join(roomName)
      })
})

eventEmitter.on('orderUpdated', (data) => {
    io.to(`order_${data.id}`).emit('orderUpdated', data)
})

eventEmitter.on('orderPlaced', (data) => {
    io.to('adminRoom').emit('orderPlaced', data)
})
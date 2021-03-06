import mongoose from 'mongoose'
import { AsyncRouter } from 'express-async-router'
import _ from 'lodash'
import getAuth from './auth'
import getActions from './user-actions'

export default (ctx) => {
  const api = AsyncRouter()
  const User = ctx.models.User
  
  api.all('/', () => ({ok: true, version: '1.0.1'}))
  api.use('/auth', getAuth(ctx))
  api.use('/actions', getActions(ctx))
  
  
  api.get('/data/getuser', async (req,res) => {
    const userID = req.query.userID
    let curUserID
    if (req.query.curUserID) {
      curUserID = req.query.curUserID
    }
    
    try {
      const user = await User.findById({ _id: userID })
        .populate('friends')
        .populate('wallcomments.user')
        .populate('requests')
        .populate('newmessages.user')
        .populate('messages.receiver')
        .populate('avatarlikes')
      
      /******Cheking if user liked current user avatar******/
      const isLiked = await User.find({
        _id: userID,
        "avatarlikes": {
          $exists: true,
          $eq: curUserID
        }
      }).count() > 0
      
      /******Cheking if user and current user are friends******/
      let friend
      if (req.query.curUserID) {
        friend = await User.findById({ _id: curUserID })
                           .where({ friends: userID })
      }
      
      /******Cheking if user sent friend request to current user******/
      let wasRequestSent
      if (!friend) {
        wasRequestSent = await User.findById({ _id: userID })
                                   .where({ requests: curUserID })
      }
      
      if (friend) {
        res.json({
          user,
          isFriend: true,
          isLiked
        })
      }
      
      if (wasRequestSent) {
        res.json({
          user,
          isFriend: false,
          wasRequestSent: true,
          isLiked
        })
      }
      if (!friend && !wasRequestSent) {
        res.json({
          user,
          isFriend: false,
          isLiked
        })
      }
    } catch (error) {
      res.status(404).send('There is no such user')
    }
  })
  
  api.get('/data/getusers', async (req,res) => {
    const filters = req.query
    const isNoFilters = _.isEmpty(filters)
    let filter
    
    if (!isNoFilters) {
      filters.online = filters.online === 'true' ? true : false
      
      filter = {
        origin: filters.origin,
        age: {
          $gte: filters.ageFrom,
          $lte: filters.ageTo
        },
        'online.currently': filters.online ? filters.online : {$ne: null}
      }
    } else { filter = {} }
    
    try {
      const users = await User.find(filter)
      res.json({
        users
      })
    } catch (error) {
      res.status(500).send({ error })
    }
  })
  
  api.get('/data/updateuser', async (req,res) => {
    const userID = req.query.userID
    
    try {
      const user = await User.findById({ _id: userID })
        .populate('requests')
        .populate('newmessages.user')
        .populate('messages.receiver')
      
      res.json({
        user
      })
    } catch (error) {
      res.status(500).send({ error })
    }
  })
  
  
  api.all('/timeout', (req, res) => {
    return new Promise(resolve => {
      setTimeout(() => {
        resolve({
          some: 123
        })
      }, 10000)
    })
  })
  
  
  return api
}

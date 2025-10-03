import { Request, Response } from 'express';
import { redisService } from '../services/redisService';
import { Topic } from '../types';

// Join matchmaking queue
export const joinQueue = async (req: Request, res: Response) => {
  const { userId, topic } = req.body;
  
  // Validate required fields
  if (!topic) {
    return res.status(400).json({
        error: 'Missing required fields: topic'
    });
  }

  // Validate topic is valid
  if (!Object.values(Topic).includes(topic as Topic)) {
    return res.status(400).json({ 
      error: 'Invalid topic. Must be one of: ' + Object.values(Topic).join(', ')
    });
  }
  
  try {
    // Check if user already in queue for this topic
    const alreadyInQueue = await redisService.isUserInQueue(userId, topic as Topic);
    if (alreadyInQueue) {
      return res.status(400).json({ 
        error: 'User already in queue for this topic' 
      });
    }
    
    // Add user to queue
    await redisService.enqueueUser(userId, topic as Topic);
    
    // Get user's position in queue
    const position = await redisService.getUserPosition(userId, topic as Topic);
    const queueSize = await redisService.getQueueSize(topic as Topic);
    
    res.json({ 
      success: true,
      message: 'Successfully joined matchmaking queue', 
      data: {
        userId, 
        topic,
        position,
        queueSize
      }
    });
  } catch (error) {
    console.error('Join queue error:', error);
    res.status(500).json({ 
      error: 'Failed to join queue',
      message: 'Internal server error'
    });
  }
};

// Find a match for user
export const findMatch = async (req: Request, res: Response) => {
  const { userId, topic } = req.body;
  
  // Validate required fields
  if (!userId || !topic) {
    return res.status(400).json({ 
      error: 'Missing required fields: userId and topic' 
    });
  }
  
  try {
    // Check if user is actually in the queue
    const isInQueue = await redisService.isUserInQueue(userId, topic as Topic);
    if (!isInQueue) {
      return res.status(400).json({
        error: 'User not in queue for this topic'
      });
    }

    // Try to find a match
    const matchedUserId = await redisService.findMatch(userId, topic as Topic);
    
    if (matchedUserId) {
      // Match found! Both users removed from queue by findMatch()
      res.json({ 
        success: true,
        match: true, 
        data: {
          matchedWith: matchedUserId,
          topic,
          message: 'Match found! Collaboration session can begin.'
        }
      });
    } else {
      // No match found yet, user stays in queue
      const position = await redisService.getUserPosition(userId, topic as Topic);
      const queueSize = await redisService.getQueueSize(topic as Topic);
      
      res.json({ 
        success: true,
        match: false, 
        data: {
          position,
          queueSize,
          message: 'No match found yet. Stay in queue.',
          estimatedWaitTime: `${(position || 1) * 30} seconds`
        }
      });
    }
  } catch (error) {
    console.error('Find match error:', error);
    res.status(500).json({ 
      error: 'Failed to find match',
      message: 'Internal server error'
    });
  }
};

// Leave matchmaking queue
export const leaveQueue = async (req: Request, res: Response) => {
  const { userId, topic } = req.body;
  
  // Validate required fields
  if (!userId || !topic) {
    return res.status(400).json({ 
      error: 'Missing required fields: userId and topic' 
    });
  }
  
  try {
    // Check if user is in queue first
    const isInQueue = await redisService.isUserInQueue(userId, topic as Topic);
    if (!isInQueue) {
      return res.status(400).json({
        error: 'User not in queue for this topic'
      });
    }

    // Remove user from queue
    await redisService.removeUserFromQueue(userId, topic as Topic);
    
    res.json({ 
      success: true,
      message: 'Successfully left matchmaking queue', 
      data: {
        userId, 
        topic
      }
    });
  } catch (error) {
    console.error('Leave queue error:', error);
    res.status(500).json({ 
      error: 'Failed to leave queue',
      message: 'Internal server error'
    });
  }
};

// Get queue status for a topic
export const getQueueStatus = async (req: Request, res: Response) => {
  const { topic } = req.params;
  
  // Validate topic
  if (!Object.values(Topic).includes(topic as Topic)) {
    return res.status(400).json({ 
      error: 'Invalid topic. Must be one of: ' + Object.values(Topic).join(', ')
    });
  }
  
  try {
    const queueSize = await redisService.getQueueSize(topic as Topic);
    
    res.json({ 
      success: true,
      data: {
        topic,
        queueSize,
        estimatedWaitTime: queueSize > 0 ? `${queueSize * 30} seconds` : '0 seconds',
        status: queueSize > 0 ? 'active' : 'empty'
      }
    });
  } catch (error) {
    console.error('Queue status error:', error);
    res.status(500).json({ 
      error: 'Failed to get queue status',
      message: 'Internal server error'
    });
  }
};

// Get user's current queue status
export const getUserStatus = async (req: Request, res: Response) => {
  const { userId } = req.params;
  const { topic } = req.query;
  
  if (!topic) {
    return res.status(400).json({
      error: 'Missing topic query parameter'
    });
  }
  
  try {
    const isInQueue = await redisService.isUserInQueue(userId, topic as Topic);
    
    if (isInQueue) {
      const position = await redisService.getUserPosition(userId, topic as Topic);
      const queueSize = await redisService.getQueueSize(topic as Topic);
      
      res.json({
        success: true,
        data: {
          userId,
          topic,
          inQueue: true,
          position,
          queueSize,
          estimatedWaitTime: `${(position || 1) * 30} seconds`
        }
      });
    } else {
      res.json({
        success: true,
        data: {
          userId,
          topic,
          inQueue: false,
          message: 'User not in queue for this topic'
        }
      });
    }
  } catch (error) {
    console.error('User status error:', error);
    res.status(500).json({
      error: 'Failed to get user status',
      message: 'Internal server error'
    });
  }
};
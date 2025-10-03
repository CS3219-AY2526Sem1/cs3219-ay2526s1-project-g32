import { redisService } from './services/redisService';
import { Topic } from './types';

async function testRedisService() {
  console.log('🧪 Starting Redis Service Test...\n');
  
  try {
    // Step 1: Connect to Redis
    console.log('1️⃣ Connecting to Redis...');
    await redisService.connect();
    console.log('✅ Connected to Redis\n');
    
    // Step 2: Test ping
    console.log('2️⃣ Testing Redis ping...');
    const pingResult = await redisService.ping();
    console.log('✅ Ping result:', pingResult, '\n');
    
    // Step 3: Test enqueue user
    console.log('3️⃣ Testing enqueue user...');
    await redisService.enqueueUser('user1', Topic.ALGORITHMS);
    console.log('✅ User1 enqueued for ALGORITHMS\n');
    
    // Step 4: Test queue size
    console.log('4️⃣ Testing queue size...');
    const queueSize = await redisService.getQueueSize(Topic.ALGORITHMS);
    console.log('✅ Queue size:', queueSize, '\n');
    
    // Step 5: Test user position
    console.log('5️⃣ Testing user position...');
    const position = await redisService.getUserPosition('user1', Topic.ALGORITHMS);
    console.log('✅ User1 position:', position, '\n');
    
    // Step 6: Add second user
    console.log('6️⃣ Adding second user...');
    await redisService.enqueueUser('user2', Topic.ALGORITHMS);
    const newQueueSize = await redisService.getQueueSize(Topic.ALGORITHMS);
    console.log('✅ User2 added, new queue size:', newQueueSize, '\n');
    
    // Step 7: Test finding match
    console.log('7️⃣ Testing match finding...');
    const matchedUser = await redisService.findMatch('user1', Topic.ALGORITHMS);
    console.log('✅ Match found:', matchedUser, '\n');
    
    // Step 8: Check queue after match
    console.log('8️⃣ Checking queue after match...');
    const finalQueueSize = await redisService.getQueueSize(Topic.ALGORITHMS);
    console.log('✅ Final queue size:', finalQueueSize, '\n');
    
    // Step 9: Test different topics don't match
    console.log('9️⃣ Testing topic isolation...');
    await redisService.enqueueUser('user3', Topic.ARRAYS);
    await redisService.enqueueUser('user4', Topic.STRINGS);
    
    const arraysMatch = await redisService.findMatch('user3', Topic.ARRAYS);
    console.log('✅ Arrays topic match (should be null):', arraysMatch, '\n');
    
    console.log('🎉 All tests completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    // Cleanup
    await redisService.disconnect();
    console.log('🔌 Disconnected from Redis');
  }
}

// Run the test
testRedisService();
// TypeScript version for importing LeetCode questions
import fetch from 'node-fetch';
import supabase from '../src/models/db';
import { QuestionCreationAttributes } from '../src/models/Question';

const LEETCODE_API_BASE = 'https://alfa-leetcode-api.onrender.com';

interface LeetCodeProblem {
  title: string;
  titleSlug: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  topicTags: Array<{
    name: string;
    slug: string;
  }>;
  isPaidOnly: boolean;
  questionFrontendId: number;
}

interface LeetCodeApiResponse {
  totalQuestions: number;
  count: number;
  problemsetQuestionList: LeetCodeProblem[];
}

interface ProblemDetails {
  question: string;
  questionLink?: string;
  titleSlug: string;
  hints: string[];
  likes: number;
  dislikes: number;
}

async function fetchLeetCodeProblems(limit: number = 500, skip: number = 0): Promise<LeetCodeProblem[]> {
  try {
    console.log(`Fetching ${limit} problems starting from position ${skip}...`);
    
    const response = await fetch(`${LEETCODE_API_BASE}/problems?limit=${limit}&skip=${skip}`);
    
    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`);
    }
    
    const data = await response.json() as LeetCodeApiResponse;
    
    // Filter out paid-only problems
    return data.problemsetQuestionList?.filter(problem => !problem.isPaidOnly) || [];
  } catch (error) {
    console.error('Error fetching problems:', error);
    return [];
  }
}

async function fetchProblemDetails(titleSlug: string): Promise<ProblemDetails | null> {
  try {
    const response = await fetch(`${LEETCODE_API_BASE}/select?titleSlug=${titleSlug}`);
    
    if (!response.ok) {
      return null;
    }
    
    const data = await response.json() as ProblemDetails;
    return data;
  } catch (error) {
    console.warn(`Error fetching details for ${titleSlug}:`, error);
    return null;
  }
}

function mapToSupabaseFormat(problem: LeetCodeProblem, details?: ProblemDetails | null): QuestionCreationAttributes {
  // Clean up description and provide fallback
  const description = details?.question 
    ? cleanHtmlContent(details.question)
    : generateFallbackDescription(problem);
  
  // Generate LeetCode problem URL as image_url (for problem reference/screenshots)
  const problemUrl = `https://leetcode.com/problems/${problem.titleSlug}/`;
  
  return {
    title: problem.title,
    description,
    difficulty: problem.difficulty,
    topics: problem.topicTags?.map(tag => tag.name) || ['General'],
    image_url: problemUrl // Use problem URL instead of undefined
  };
}

function cleanHtmlContent(htmlContent: string): string {
  // Remove HTML tags and clean up the content
  return htmlContent
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .replace(/&nbsp;/g, ' ') // Replace &nbsp; with spaces
    .replace(/&amp;/g, '&') // Replace &amp; with &
    .replace(/&lt;/g, '<') // Replace &lt; with <
    .replace(/&gt;/g, '>') // Replace &gt; with >
    .replace(/&quot;/g, '"') // Replace &quot; with "
    .trim();
}

function generateFallbackDescription(problem: LeetCodeProblem): string {
  const topics = problem.topicTags?.map(tag => tag.name).join(', ') || 'General';
  return `This is a ${problem.difficulty.toLowerCase()} level problem focusing on: ${topics}. ` +
         `Problem ID: ${problem.questionFrontendId}. ` +
         `Solve this step by step and consider edge cases.`;
}

async function deleteAllQuestions(): Promise<void> {
  console.log('\n🗑️  Deleting all existing questions from Supabase...');
  
  // Delete all rows
  const { error } = await supabase
    .from('questions')
    .delete()
    .neq('id', 0); // Delete all rows (neq with impossible condition)
  
  if (error) {
    console.error('❌ Error deleting existing questions:', error);
    throw error;
  }
  
  console.log(`✅ Successfully deleted all existing questions`);
  
  // Reset the ID sequence to start from 1
  console.log('🔄 Resetting ID sequence...');
  const { error: resetError } = await supabase.rpc('reset_questions_sequence');
  
  if (resetError) {
    console.warn('⚠️  Could not reset sequence via RPC, trying direct SQL...');
    // Fallback: Use raw SQL to reset the sequence
    const { error: sqlError } = await supabase
      .from('questions')
      .select('id')
      .limit(0); // Just to execute, then we'll use a workaround
    
    // Note: If this fails, the sequence will continue from the last ID
    // You may need to manually reset it in Supabase SQL editor with:
    // ALTER SEQUENCE questions_id_seq RESTART WITH 1;
    console.log('ℹ️  If IDs don\'t start from 1, manually run in Supabase SQL Editor:');
    console.log('   ALTER SEQUENCE questions_id_seq RESTART WITH 1;');
  } else {
    console.log(`✅ Successfully reset ID sequence to start from 1`);
  }
}

async function insertProblemsToSupabase(problems: QuestionCreationAttributes[]): Promise<void> {
  const batchSize = 50; // Smaller batches for better reliability
  let successCount = 0;
  
  for (let i = 0; i < problems.length; i += batchSize) {
    const batch = problems.slice(i, i + batchSize);
    console.log(`Inserting batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(problems.length/batchSize)} (${batch.length} problems)...`);
    
    try {
      const { data, error } = await supabase
        .from('questions')
        .insert(batch)
        .select();
      
      if (error) {
        console.error('Supabase insert error:', error);
        console.log('Problematic batch:', batch.map(p => p.title));
        continue;
      }
      
      successCount += data?.length || 0;
      console.log(`✅ Successfully inserted ${data?.length} problems (Total: ${successCount})`);
    } catch (error) {
      console.error('Error inserting batch:', error);
    }
    
    // Delay between batches to respect rate limits
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  console.log(`\n🎉 Import completed! Successfully inserted ${successCount} out of ${problems.length} problems.`);
}

async function main(): Promise<void> {
  console.log('🚀 Starting LeetCode questions import to Supabase...');
  
  const allProblems: QuestionCreationAttributes[] = [];
  let skip = 0;
  const batchSize = 500;
  const targetCount = 1000;
  
  // Fetch problems in batches
  while (allProblems.length < targetCount) {
    const problems = await fetchLeetCodeProblems(batchSize, skip);
    
    if (problems.length === 0) {
      console.log('No more problems available from API');
      break;
    }
    
    console.log(`Processing ${problems.length} problems...`);
    
    // Process each problem
    for (const problem of problems) {
      if (allProblems.length >= targetCount) break;
      
      // For first 100 problems, fetch detailed descriptions
      let details: ProblemDetails | null = null;
      if (allProblems.length < 100) {
        details = await fetchProblemDetails(problem.titleSlug);
        // Respect rate limits
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      const mappedProblem = mapToSupabaseFormat(problem, details);
      allProblems.push(mappedProblem);
      
      if (allProblems.length % 50 === 0) {
        console.log(`Progress: ${allProblems.length}/${targetCount} problems processed`);
      }
    }
    
    skip += batchSize;
  }
  
  // Display statistics
  const difficultyStats = {
    Easy: allProblems.filter(p => p.difficulty === 'Easy').length,
    Medium: allProblems.filter(p => p.difficulty === 'Medium').length,
    Hard: allProblems.filter(p => p.difficulty === 'Hard').length
  };
  
  console.log(`\n📊 Collected ${allProblems.length} problems:`);
  console.log(`   Easy: ${difficultyStats.Easy}`);
  console.log(`   Medium: ${difficultyStats.Medium}`);
  console.log(`   Hard: ${difficultyStats.Hard}`);
  
  // Delete existing questions before inserting
  if (allProblems.length > 0) {
    await deleteAllQuestions();
    await insertProblemsToSupabase(allProblems);
  } else {
    console.log('❌ No problems to import');
  }
}

// Export for use as module or run directly
export { main as importLeetCodeQuestions };

// Run if this file is executed directly
if (require.main === module) {
  main().catch(console.error);
}
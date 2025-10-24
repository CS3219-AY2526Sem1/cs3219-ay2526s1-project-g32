"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.importLeetCodeQuestions = main;
// TypeScript version for importing LeetCode questions
const node_fetch_1 = __importDefault(require("node-fetch"));
const db_1 = __importDefault(require("../src/models/db"));
const LEETCODE_API_BASE = 'https://alfa-leetcode-api.onrender.com';
async function fetchLeetCodeProblems(limit = 500, skip = 0) {
    try {
        console.log(`Fetching ${limit} problems starting from position ${skip}...`);
        const response = await (0, node_fetch_1.default)(`${LEETCODE_API_BASE}/problems?limit=${limit}&skip=${skip}`);
        const data = await response.json();
        if (!response.ok) {
            throw new Error(`API Error: ${response.status}`);
        }
        // Filter out paid-only problems
        return data.problemsetQuestionList?.filter(problem => !problem.isPaidOnly) || [];
    }
    catch (error) {
        console.error('Error fetching problems:', error);
        return [];
    }
}
async function fetchProblemDetails(titleSlug) {
    try {
        const response = await (0, node_fetch_1.default)(`${LEETCODE_API_BASE}/select?titleSlug=${titleSlug}`);
        if (!response.ok) {
            return null;
        }
        const data = await response.json();
        return data;
    }
    catch (error) {
        console.warn(`Error fetching details for ${titleSlug}:`, error);
        return null;
    }
}
function mapToSupabaseFormat(problem, details) {
    // Clean up description and provide fallback
    const description = details?.question
        ? cleanHtmlContent(details.question)
        : generateFallbackDescription(problem);
    return {
        title: problem.title,
        description,
        difficulty: problem.difficulty,
        topics: problem.topicTags?.map(tag => tag.name) || ['General'],
        image_url: undefined // Most problems don't have images
    };
}
function cleanHtmlContent(htmlContent) {
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
function generateFallbackDescription(problem) {
    const topics = problem.topicTags?.map(tag => tag.name).join(', ') || 'General';
    return `This is a ${problem.difficulty.toLowerCase()} level problem focusing on: ${topics}. ` +
        `Problem ID: ${problem.questionFrontendId}. ` +
        `Solve this step by step and consider edge cases.`;
}
async function insertProblemsToSupabase(problems) {
    const batchSize = 50; // Smaller batches for better reliability
    let successCount = 0;
    for (let i = 0; i < problems.length; i += batchSize) {
        const batch = problems.slice(i, i + batchSize);
        console.log(`Inserting batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(problems.length / batchSize)} (${batch.length} problems)...`);
        try {
            const { data, error } = await db_1.default
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
        }
        catch (error) {
            console.error('Error inserting batch:', error);
        }
        // Delay between batches to respect rate limits
        await new Promise(resolve => setTimeout(resolve, 2000));
    }
    console.log(`\n🎉 Import completed! Successfully inserted ${successCount} out of ${problems.length} problems.`);
}
async function main() {
    console.log('🚀 Starting LeetCode questions import to Supabase...');
    const allProblems = [];
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
            if (allProblems.length >= targetCount)
                break;
            // For first 100 problems, fetch detailed descriptions
            let details = null;
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
    // Insert to Supabase
    if (allProblems.length > 0) {
        await insertProblemsToSupabase(allProblems);
    }
    else {
        console.log('❌ No problems to import');
    }
}
// Run if this file is executed directly
if (require.main === module) {
    main().catch(console.error);
}

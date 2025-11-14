export const sampleQuestions = [
  {
    title: "Two Sum",
    slug: "two-sum",
    difficulty: "Easy",
    topics: "\"[\\\"Array\\\", \\\"Hash Table\\\"]\"",
    description: "Given an array of integers `nums` and an integer `target`, return *indices of the two numbers such that they add up to `target`*.\r\n\r\nYou may assume that each input would have ***exactly* one solution**, and you may not use the *same* element twice.\r\n\r\nYou can return the answer in any order.\r\n\r\n**Example 1:**\r\n\r\n```\r\nInput: nums = [2,7,11,15], target = 9\r\nOutput: [0,1]\r\nExplanation: Because nums[0] + nums[1] == 9, we return [0, 1].\r\n```\r\n\r\n**Example 2:**\r\n\r\n```\r\nInput: nums = [3,2,4], target = 6\r\nOutput: [1,2]\r\n```\r\n\r\n**Example 3:**\r\n\r\n```\r\nInput: nums = [3,3], target = 6\r\nOutput: [0,1]\r\n```\r\n\r\n**Constraints:**\r\n\r\n* `2 <= nums.length <= 104`\r\n* `-109 <= nums[i] <= 109`\r\n* `-109 <= target <= 109`\r\n* **Only one valid answer exists.**\r\n\r\n**Follow-up:**Can you come up with an algorithm that is less than `O(n2)` time complexity?",
    starter_python: "class Solution:\n    def twoSum(self, nums: List[int], target: int) -> List[int]:\n        ",
    starter_c: "/**\n * Note: The returned array must be malloced, assume caller calls free().\n */\nint* twoSum(int* nums, int numsSize, int target, int* returnSize) {\n    \n}",
    starter_cpp: "class Solution {\npublic:\n    vector<int> twoSum(vector<int>& nums, int target) {\n        \n    }\n};",
    starter_java: "class Solution {\n    public int[] twoSum(int[] nums, int target) {\n        \n    }\n}",
    starter_javascript: "/**\n * @param {number[]} nums\n * @param {number} target\n * @return {number[]}\n */\nvar twoSum = function(nums, target) {\n    \n};"
  },
  {
    title: "Add Two Numbers",
    slug: "add-two-numbers",
    difficulty: "Medium",
    topics: "\"[\\\"Linked List\\\", \\\"Math\\\", \\\"Recursion\\\"]\"",
    description: "You are given two **non-empty** linked lists representing two non-negative integers. The digits are stored in **reverse order**, and each of their nodes contains a single digit. Add the two numbers and return the sum as a linked list.\r\n\r\nYou may assume the two numbers do not contain any leading zero, except the number 0 itself.\r\n\r\n**Example 1:**\r\n\r\n![](https://assets.leetcode.com/uploads/2020/10/02/addtwonumber1.jpg)\r\n\r\n```\r\nInput: l1 = [2,4,3], l2 = [5,6,4]\r\nOutput: [7,0,8]\r\nExplanation: 342 + 465 = 807.\r\n```\r\n\r\n**Example 2:**\r\n\r\n```\r\nInput: l1 = [0], l2 = [0]\r\nOutput: [0]\r\n```\r\n\r\n**Example 3:**\r\n\r\n```\r\nInput: l1 = [9,9,9,9,9,9,9], l2 = [9,9,9,9]\r\nOutput: [8,9,9,9,0,0,0,1]\r\n```\r\n\r\n**Constraints:**\r\n\r\n* The number of nodes in each linked list is in the range `[1, 100]`.\r\n* `0 <= Node.val <= 9`\r\n* It is guaranteed that the list represents a number that does not have leading zeros.",
    starter_python: "# Definition for singly-linked list.\n# class ListNode:\n#     def __init__(self, val=0, next=None):\n#         self.val = val\n#         self.next = next\nclass Solution:\n    def addTwoNumbers(self, l1: Optional[ListNode], l2: Optional[ListNode]) -> Optional[ListNode]:\n        ",
    starter_c: "/**\n * Definition for singly-linked list.\n * struct ListNode {\n *     int val;\n *     struct ListNode *next;\n * };\n */\nstruct ListNode* addTwoNumbers(struct ListNode* l1, struct ListNode* l2) {\n    \n}",
    starter_cpp: "/**\n * Definition for singly-linked list.\n * struct ListNode {\n *     int val;\n *     ListNode *next;\n *     ListNode() : val(0), next(nullptr) {}\n *     ListNode(int x) : val(x), next(nullptr) {}\n *     ListNode(int x, ListNode *next) : val(x), next(next) {}\n * };\n */\nclass Solution {\npublic:\n    ListNode* addTwoNumbers(ListNode* l1, ListNode* l2) {\n        \n    }\n};",
    starter_java: "/**\n * Definition for singly-linked list.\n * public class ListNode {\n *     int val;\n *     ListNode next;\n *     ListNode() {}\n *     ListNode(int val) { this.val = val; }\n *     ListNode(int val, ListNode next) { this.val = val; this.next = next; }\n * }\n */\nclass Solution {\n    public ListNode addTwoNumbers(ListNode l1, ListNode l2) {\n        \n    }\n}",
    starter_javascript: "/**\n * Definition for singly-linked list.\n * function ListNode(val, next) {\n *     this.val = (val===undefined ? 0 : val)\n *     this.next = (next===undefined ? null : next)\n * }\n */\n/**\n * @param {ListNode} l1\n * @param {ListNode} l2\n * @return {ListNode}\n */\nvar addTwoNumbers = function(l1, l2) {\n    \n};"
  },
  {
    title: "Longest Substring Without Repeating Characters",
    slug: "longest-substring-without-repeating-characters",
    difficulty: "Medium",
    topics: "\"[\\\"Hash Table\\\", \\\"String\\\", \\\"Sliding Window\\\"]\"",
    description: "Given a string `s`, find the length of the **longest** **substring** without duplicate characters.\r\n\r\n**Example 1:**\r\n\r\n```\r\nInput: s = \"abcabcbb\"\r\nOutput: 3\r\nExplanation: The answer is \"abc\", with the length of 3. Note that \"bca\" and \"cab\" are also correct answers.\r\n```\r\n\r\n**Example 2:**\r\n\r\n```\r\nInput: s = \"bbbbb\"\r\nOutput: 1\r\nExplanation: The answer is \"b\", with the length of 1.\r\n```\r\n\r\n**Example 3:**\r\n\r\n```\r\nInput: s = \"pwwkew\"\r\nOutput: 3\r\nExplanation: The answer is \"wke\", with the length of 3.\r\nNotice that the answer must be a substring, \"pwke\" is a subsequence and not a substring.\r\n```\r\n\r\n**Constraints:**\r\n\r\n* `0 <= s.length <= 5 * 104`\r\n* `s` consists of English letters, digits, symbols and spaces.",
    starter_python: "class Solution:\n    def lengthOfLongestSubstring(self, s: str) -> int:\n        ",
    starter_c: "int lengthOfLongestSubstring(char* s) {\n    \n}",
    starter_cpp: "class Solution {\npublic:\n    int lengthOfLongestSubstring(string s) {\n        \n    }\n};",
    starter_java: "class Solution {\n    public int lengthOfLongestSubstring(String s) {\n        \n    }\n}",
    starter_javascript: "/**\n * @param {string} s\n * @return {number}\n */\nvar lengthOfLongestSubstring = function(s) {\n    \n};"
  },
];

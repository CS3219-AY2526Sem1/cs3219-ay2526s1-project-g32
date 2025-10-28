-- Questions table for CS3219 Project

CREATE TABLE IF NOT EXISTS questions (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  difficulty VARCHAR(10) NOT NULL CHECK (difficulty IN ('Easy', 'Medium', 'Hard')),
  topics TEXT[] NOT NULL,
  image_url VARCHAR(500),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create an index on difficulty for faster filtering
CREATE INDEX IF NOT EXISTS idx_questions_difficulty ON questions(difficulty);

-- Create an index on topics for faster topic filtering
CREATE INDEX IF NOT EXISTS idx_questions_topics ON questions USING GIN(topics);

-- Create a trigger to automatically update the updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_questions_updated_at 
    BEFORE UPDATE ON questions 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Function to reset the questions ID sequence
CREATE OR REPLACE FUNCTION reset_questions_sequence()
RETURNS void AS $$
BEGIN
    -- Reset the sequence to start from 1
    ALTER SEQUENCE questions_id_seq RESTART WITH 1;
END;
$$ LANGUAGE plpgsql;

-- Insert some sample data
INSERT INTO questions (title, description, difficulty, topics, image_url) VALUES 
('Two Sum', 'Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target.', 'Easy', ARRAY['Array', 'Hash Table'], NULL),
('Add Two Numbers', 'You are given two non-empty linked lists representing two non-negative integers.', 'Medium', ARRAY['Linked List', 'Math'], NULL),
('Longest Substring Without Repeating Characters', 'Given a string s, find the length of the longest substring without repeating characters.', 'Medium', ARRAY['Hash Table', 'String', 'Sliding Window'], NULL),
('Median of Two Sorted Arrays', 'Given two sorted arrays nums1 and nums2 of size m and n respectively, return the median of the two sorted arrays.', 'Hard', ARRAY['Array', 'Binary Search', 'Divide and Conquer'], NULL);
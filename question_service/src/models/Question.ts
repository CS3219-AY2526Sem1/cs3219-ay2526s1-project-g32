import supabase from "./db";

// Database row interface (matches Supabase table structure)
export interface QuestionRow {
  id: number;
  title: string;
  description: string;
  difficulty: "Easy" | "Medium" | "Hard";
  topics: string[];
  image_url?: string;
  created_at: string;
  updated_at: string;
}

// API interface (for requests/responses)
export interface QuestionAttributes {
  id: number;
  title: string;
  description: string;
  difficulty: "Easy" | "Medium" | "Hard";
  topics: string[];
  image_url?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface QuestionCreationAttributes {
  title: string;
  description: string;
  difficulty: "Easy" | "Medium" | "Hard";
  topics: string[];
  image_url?: string;
}

// Question service class for Supabase operations
export class QuestionService {
  private static readonly tableName = 'questions';

  // Convert database row to API format
  private static mapRowToAttributes(row: QuestionRow): QuestionAttributes {
    return {
      id: row.id,
      title: row.title,
      description: row.description,
      difficulty: row.difficulty,
      topics: row.topics,
      image_url: row.image_url,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    };
  }

  // Get all questions
  static async findAll(): Promise<QuestionAttributes[]> {
    const { data, error } = await supabase
      .from(this.tableName)
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data?.map(this.mapRowToAttributes) || [];
  }

  // Get question by ID
  static async findByPk(id: number): Promise<QuestionAttributes | null> {
    const { data, error } = await supabase
      .from(this.tableName)
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // No rows found
      throw error;
    }
    return data ? this.mapRowToAttributes(data) : null;
  }

  // Create new question
  static async create(attributes: QuestionCreationAttributes): Promise<QuestionAttributes> {
    const { data, error } = await supabase
      .from(this.tableName)
      .insert([attributes])
      .select()
      .single();

    if (error) throw error;
    return this.mapRowToAttributes(data);
  }

  // Update question
  static async update(id: number, attributes: Partial<QuestionCreationAttributes>): Promise<QuestionAttributes | null> {
    const { data, error } = await supabase
      .from(this.tableName)
      .update(attributes)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // No rows found
      throw error;
    }
    return data ? this.mapRowToAttributes(data) : null;
  }

  // Delete question
  static async destroy(id: number): Promise<boolean> {
    const { error } = await supabase
      .from(this.tableName)
      .delete()
      .eq('id', id);

    if (error) throw error;
    return true;
  }
}

export default QuestionService;

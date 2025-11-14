import supabase from "./db";

// Database row interface (matches Supabase questions table structure)
export interface QuestionRow {
  id: number;
  title: string;
  slug: string;
  difficulty: string;
  topics: string[];
  description: string;
  starter_python?: string;
  starter_c?: string;
  starter_cpp?: string;
  starter_java?: string;
  starter_javascript?: string;
}

// API interface (for requests/responses)
export interface QuestionAttributes {
  id: number;
  title: string;
  slug: string;
  difficulty: string;
  topics: string[];
  description: string;
  starterCode?: {
    python?: string;
    c?: string;
    cpp?: string;
    java?: string;
    javascript?: string;
  };
}

export interface QuestionCreationAttributes {
  title: string;
  slug: string;
  difficulty: string;
  topics: string[];
  description: string;
  starter_python?: string;
  starter_c?: string;
  starter_cpp?: string;
  starter_java?: string;
  starter_javascript?: string;
}

// Question service class for Supabase operations
export class QuestionService {
  private static readonly tableName = 'questions';

  // Convert database row to API format
  private static mapRowToAttributes(row: QuestionRow): QuestionAttributes {
    return {
      id: row.id,
      title: row.title,
      slug: row.slug,
      difficulty: row.difficulty,
      topics: row.topics,
      description: row.description,
      starterCode: {
        python: row.starter_python,
        c: row.starter_c,
        cpp: row.starter_cpp,
        java: row.starter_java,
        javascript: row.starter_javascript
      }
    };
  }

  // Get all questions
  static async findAll(): Promise<QuestionAttributes[]> {
    const { data, error } = await supabase
      .from(this.tableName)
      .select('*')
      .order('id', { ascending: true });

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
    // Get the maximum ID and add 1 to generate the next ID
    const { data: maxData, error: maxError } = await supabase
      .from(this.tableName)
      .select('id')
      .order('id', { ascending: false })
      .limit(1)
      .single();

    if (maxError && maxError.code !== 'PGRST116') {
      throw maxError;
    }

    const nextId = maxData ? maxData.id + 1 : 1;
    console.log('Creating question with nextId:', nextId, 'attributes:', attributes);

    const { data, error } = await supabase
      .from(this.tableName)
      .insert([{ id: nextId, ...attributes }])
      .select()
      .single();

    if (error) {
      console.error('Insert error:', error);
      throw error;
    }
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

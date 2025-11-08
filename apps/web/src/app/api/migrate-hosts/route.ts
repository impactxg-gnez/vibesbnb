import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// This endpoint requires admin access
// Use Supabase service role key for admin operations
export async function POST(request: Request) {
  try {
    const { emails, allUsers } = await request.json();

    // Get Supabase service role key from environment
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json(
        { error: 'Supabase configuration missing' },
        { status: 500 }
      );
    }

    // Create admin client with service role key
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    let updatedCount = 0;
    const errors: string[] = [];

    if (allUsers) {
      // Update all users who don't have a role or have a role that's not 'host'
      const { data: users, error: fetchError } = await supabaseAdmin.auth.admin.listUsers();

      if (fetchError) {
        return NextResponse.json(
          { error: `Failed to fetch users: ${fetchError.message}` },
          { status: 500 }
        );
      }

      for (const user of users.users) {
        const currentRole = user.user_metadata?.role;
        
        // Skip if already a host
        if (currentRole === 'host') {
          continue;
        }

        // Update user metadata
        const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
          user.id,
          {
            user_metadata: {
              ...user.user_metadata,
              role: 'host',
            },
          }
        );

        if (updateError) {
          errors.push(`Failed to update ${user.email}: ${updateError.message}`);
        } else {
          updatedCount++;
        }
      }
    } else if (emails && Array.isArray(emails) && emails.length > 0) {
      // Update specific users by email
      for (const email of emails) {
        // Find user by email
        const { data: users, error: fetchError } = await supabaseAdmin.auth.admin.listUsers();

        if (fetchError) {
          errors.push(`Failed to fetch users: ${fetchError.message}`);
          continue;
        }

        const user = users.users.find((u) => u.email === email);

        if (!user) {
          errors.push(`User not found: ${email}`);
          continue;
        }

        // Skip if already a host
        if (user.user_metadata?.role === 'host') {
          continue;
        }

        // Update user metadata
        const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
          user.id,
          {
            user_metadata: {
              ...user.user_metadata,
              role: 'host',
            },
          }
        );

        if (updateError) {
          errors.push(`Failed to update ${email}: ${updateError.message}`);
        } else {
          updatedCount++;
        }
      }
    } else {
      return NextResponse.json(
        { error: 'Please provide either emails array or set allUsers to true' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      updatedCount,
      errors: errors.length > 0 ? errors : undefined,
      message: `Successfully migrated ${updatedCount} user(s) to host role`,
    });
  } catch (error: any) {
    console.error('Migration error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to migrate users' },
      { status: 500 }
    );
  }
}


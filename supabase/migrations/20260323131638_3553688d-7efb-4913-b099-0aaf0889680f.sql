-- Create storage bucket for blog cover images
insert into storage.buckets (id, name, public)
values ('blog-covers', 'blog-covers', true);

-- Allow authenticated users to upload files
create policy "Authenticated users can upload blog covers"
on storage.objects for insert
to authenticated
with check (bucket_id = 'blog-covers');

-- Allow authenticated users to update files
create policy "Authenticated users can update blog covers"
on storage.objects for update
to authenticated
using (bucket_id = 'blog-covers');

-- Allow authenticated users to delete files
create policy "Authenticated users can delete blog covers"
on storage.objects for delete
to authenticated
using (bucket_id = 'blog-covers');

-- Allow public read access
create policy "Public read access for blog covers"
on storage.objects for select
to anon, authenticated
using (bucket_id = 'blog-covers');
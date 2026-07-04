import type { APIRoute } from 'astro';

export const POST: APIRoute = async ({ request }) => {
    try {
        const data = await request.formData();
        const file = data.get('file') as File;

        if (!file) {
            return new Response(JSON.stringify({ error: 'No file uploaded' }), { status: 400 });
        }

        // Simulasi konversi (di real app, gunakan library sharp atau pdf-lib di sini)
        // Karena ini demo, kita hanya mengembalikan pesan sukses
        return new Response(JSON.stringify({
            message: 'File received successfully (Simulation Mode)',
            filename: file.name,
            size: file.size,
            type: file.type
        }), { status: 200 });

    } catch (error) {
        return new Response(JSON.stringify({ error: 'Process failed' }), { status: 500 });
    }
};

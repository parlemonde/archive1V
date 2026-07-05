import { AwsClient } from 'aws4fetch';
import mime from 'mime-types';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, sep } from 'node:path';

export async function uploadArchiveToS3(bucket: string, path: string, prefix: string): Promise<void> {
    const accessKeyId = process.env.AWS_ACCESS_KEY_ID ?? '';
    const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY ?? '';
    const region = process.env.AWS_REGION ?? 'eu-west-3';
    const sessionToken = process.env.AWS_SESSION_TOKEN;

    if (!accessKeyId || !secretAccessKey) {
        throw new Error('AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY must be set');
    }

    const client = new AwsClient({ accessKeyId, secretAccessKey, region, sessionToken, service: 's3' });

    for (const entry of readdirSync(path, { recursive: true, encoding: 'utf-8' })) {
        const fullPath = join(path, entry);
        if (!statSync(fullPath).isFile()) continue;

        const key = `${prefix}/${entry.split(sep).join('/')}`;
        const contentType = mime.lookup(key) || 'application/octet-stream';
        const body = readFileSync(fullPath);
        const url = `https://${bucket}.s3.${region}.amazonaws.com/${encodeURIComponent(key)}`;

        const response = await client.fetch(url, {
            method: 'PUT',
            body,
            headers: { 'Content-Type': contentType },
        });

        if (!response.ok) {
            throw new Error(`Failed to upload ${key}: ${response.status} ${response.statusText}`);
        }

        console.info(`Uploaded ${key}`);
    }
}

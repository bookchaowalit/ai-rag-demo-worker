const allow = process.env.ALLOW_RAG_DEMO_DEPLOY === 'true';

if (!allow) {
  console.error(
    'RAG demo deployment blocked. This worker is superseded and in-memory. ' +
    'Set ALLOW_RAG_DEMO_DEPLOY=true only for an explicit demo deployment.',
  );
  process.exit(1);
}

console.log('RAG demo deployment explicitly enabled. Do not use this worker for production data.');

const seedCleanDatabase = async () => {
  throw new Error(
    'Database seeding is disabled to protect existing MongoDB Atlas records.'
  );
};

if (require.main === module) {
  seedCleanDatabase().catch((error) => {
    console.error(`[Seed Error] ${error.message}`);
    process.exitCode = 1;
  });
}

module.exports = seedCleanDatabase;

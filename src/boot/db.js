import dbService from 'src/services/db'
export default async () => {
  await dbService.initDatabase()
}

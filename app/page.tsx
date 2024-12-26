import { createClient } from "@/utils/supabase/server"
import { TestSuiteCalendar } from "@/components/test-suite-calendar"

export default async function Home() {
  const supabase = await createClient()
  
  
  const { data: schedulerData, error } = await supabase
    .from('scheduler')
    .select('*')

  if (error) {
    console.error('Error fetching initial data:', error)
    return (
      <div>
        <TestSuiteCalendar initialEvents={[]} />
      </div>
    )
  }

  
  const initialEvents = schedulerData.map(record => ({
    id: record.id || crypto.randomUUID(),
    name: record.title,
    datetime: new Date(record.time)
  }))

  return (
    <div>
      <TestSuiteCalendar initialEvents={initialEvents} />
    </div>
  )
}
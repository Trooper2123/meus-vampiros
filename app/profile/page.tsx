import { redirect } from 'next/navigation'
import { getUserOrDev } from '@/lib/auth0'
import { ProfileEditor } from '@/components/profile/profile-editor'
export default async function ProfilePage(){
 const user=await getUserOrDev()
 if(!user?.sub)redirect('/auth/login')
 return <main className="mx-auto max-w-2xl px-4 py-10"><ProfileEditor/></main>
}

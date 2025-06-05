import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet"
import { Menu } from "lucide-react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { supabase } from "@/supabase/client"
import { toast } from "sonner"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { useNavigate } from "react-router-dom"
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"

export default function AdminPanel() {
  const [selectedSection, setSelectedSection] = useState("главная");
	const [users, setUsers] = useState([]);

  const [isSheetOpen, setIsSheetOpen] = useState(false);
	const [deletingId, setDeletingId] = useState();

	const navigate = useNavigate();

  const handleSectionChange = (section) => {
    setSelectedSection(section)
    setIsSheetOpen(false)
  }

	const fetchUsers = async () => {
		const response = await supabase
			.from("users")
			.select(`id, fullname, email, image, leader_id, department:users_departmentId_fkey(*)`)
			.eq("active", true);


		if (response.error) {
			toast.error(response.error.message)
			return
		}

		response.data = await Promise.all(response.data.map(
			u => u.leader_id
				? supabase.from("users").select("fullname").eq("id", u.leader_id).eq("active", true).then(({data}) => ({ ...u, leader: data[0].fullname }))
				: u
		))

		setUsers(response.data)
	}

	useEffect(() => { fetchUsers() }, [])
	useEffect(() => { console.log(deletingId) }, [deletingId])

  return (
    <div className="flex min-h-screen bg-gray-100">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-64 bg-white border-r flex-col p-4">
        <div className="text-2xl font-bold mb-6">Панель управления</div>
        <nav className="flex flex-col gap-2">
          <Button
            variant={selectedSection === "главная" ? "default" : "ghost"}
            onClick={() => setSelectedSection("главная")}
            className="justify-start"
          >
            Главная
          </Button>
          <Button
            variant={selectedSection === "пользователи" ? "default" : "ghost"}
            onClick={() => setSelectedSection("пользователи")}
            className="justify-start"
          >
            Пользователи
          </Button>
        </nav>
      </aside>

      {/* Main Section */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="bg-white shadow p-4 flex items-center justify-between">
          <div className="md:hidden">
            <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Menu />
                </Button>
              </SheetTrigger>
              <SheetContent side="left">
                <div className="text-2xl font-bold mb-6">Панель управления</div>
                <nav className="flex flex-col gap-2">
                  <Button
                    variant={selectedSection === "главная" ? "default" : "ghost"}
                    onClick={() => handleSectionChange("главная")}
                    className="justify-start"
                  >
                    Главная
                  </Button>
                  <Button
                    variant={selectedSection === "пользователи" ? "default" : "ghost"}
                    onClick={() => handleSectionChange("пользователи")}
                    className="justify-start"
                  >
                    Пользователи
                  </Button>
                </nav>
              </SheetContent>
            </Sheet>
          </div>

          <div className="text-xl font-semibold capitalize">
            {selectedSection}
          </div>
        </header>

        <main className="p-6">
          {selectedSection === "главная" && (
            <div>Это главная страница со статистикой приложения. Она пока пустая.</div>
          )}
          {selectedSection === "пользователи" && (
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Аватар</TableHead>
									<TableHead>ФИО</TableHead>
									<TableHead>Электронная почта</TableHead>
									<TableHead>Департамент</TableHead>
									<TableHead>Руководитель</TableHead>
									<TableHead>Действия</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{
									users.map(u => (
										<TableRow
											key={u.id}
											className="cursor-pointer hover:bg-[#d7d7d7] transition-all duration-300"
											onClick={() => navigate(`/admin/users/${u.id}`)}
										>
											<TableCell>
												<Avatar>
													<AvatarImage
														src={u.image}
														alt={u.fullname}
													/>
													<AvatarFallback>{u.fullname[0]}</AvatarFallback>
												</Avatar>
											</TableCell>
											<TableCell>{u.fullname}</TableCell>
											<TableCell>{u.email}</TableCell>
											<TableCell>{u.department?.name || "Не пренадлежит"}</TableCell>
											<TableCell>{u.leader || "Нет руководителя"}</TableCell>
											<TableCell className="space-x-2">
												<Dialog onOpenChange={() => setDeletingId(p => !p ? u.id : null)}>
													<DialogTrigger asChild>
														<Button variant="destructive" size="sm" onClick={e => e.stopPropagation()}>
															Delete
														</Button>
													</DialogTrigger>
													<DialogContent onClick={e => e.stopPropagation()}>
														<DialogHeader>
															<DialogTitle>Удалить пользователя</DialogTitle>
															<DialogDescription>
																Вы точно хотите удалить пользователя {u.fullname}? После удаления пользователя вернуть будет уже нельзя!
															</DialogDescription>
														</DialogHeader>
														<DialogFooter>
															<DialogClose asChild>
																<Button variant="ghost" onClick={() => setDeletingId(null)}>
																	Отмена
																</Button>
															</DialogClose>
															<DialogClose asChild>
																<Button variant="destructive" onClick={async () => {
																	const { error } = await supabase.from("users").update({ active: false }).eq("id", u.id)
																	if (!error) {
																		toast.success(`Пользователь ${u.fullname} успешно удалён!`)
																		setUsers(p => p.filter(fu => fu.id != u.id))
																		return
																	}
																	toast.error(`Что-то пошло не так... Попробуйте снова или свяжитесь с поддержкой`)
																}}>
																	Удалить
																</Button>
															</DialogClose>
														</DialogFooter>
													</DialogContent>
												</Dialog>
											</TableCell>
										</TableRow>
									))
								}
							</TableBody>
						</Table>
          )}
        </main>
      </div>
    </div>
  )
}

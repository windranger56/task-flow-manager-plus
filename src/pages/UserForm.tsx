'use client';

import { useEffect, useRef, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { z } from 'zod'
import { zodResolver } from "@hookform/resolvers/zod";
import { supabase } from '@/supabase/client';
import { Form, FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form';
import { useNavigate } from 'react-router-dom';
import { Upload } from 'lucide-react';

export default function UserForm() {
	const { id } = useParams<{ id: string }>();

	const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

	const navigate = useNavigate();

	const form = useForm<z.infer<typeof schema>>({
		resolver: zodResolver(schema),
		defaultValues: {
			fullname: "", email: "", password: ""
		},
		mode: "onChange"
	});

	useEffect(() => {
		if (id) (
			supabase.from('users').select("*").eq("id", id).then(({ error, data }) => {
				if (error || !data.length) navigate("not-found")
				form.setValue("fullname", data[0].fullname)
				form.setValue("email", data[0].email)
			})
		)
	}, [])

	const handleAvatarChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    setAvatarFile(file);
    
    // Create preview URL
    const reader = new FileReader();
    reader.onload = (e) => {
      setAvatarPreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

	const onSubmit = async (values: z.infer<typeof schema>) => {
		try {
			let avatarUrl = null;

			if (avatarFile) {
				const fileExt = avatarFile.name.split('.').pop();
				const filePath = `${id}/avatar.${fileExt}`;

				try {
					const { error: uploadError } = await supabase.storage
						.from('images')
						.upload(filePath, avatarFile, { upsert: true });

					if (uploadError) throw uploadError;

					const { data: { publicUrl } } = supabase.storage
						.from('images')
						.getPublicUrl(filePath);
						
					avatarUrl = publicUrl;
				} catch (error) {
					console.error("Avatar upload error:", error);
					// Continue even if avatar upload fails
				}
			}

			// Editing an existing user
			const { error: updateError } = await supabase
				.from('users')
				.update({
					fullname: values.fullname,
					email: values.email,
					...(avatarUrl ? { image: avatarUrl } : {})
				})
				.eq('id', id);

			if (updateError) {
				console.error("Update error:", updateError);
				alert("Ошибка при обновлении пользователя");
				return;
			}

			navigate("/admin");
		} catch (err) {
			console.error("Unhandled error:", err);
			alert("Произошла ошибка. Попробуйте снова.");
		}
	};


  return (
    <Card className="max-w-md mx-auto mt-10 shadow-xl p-6">
			<CardHeader>
				<CardTitle>
					{ id ? "Редактирование пользователя" : "Создание пользователя" }
				</CardTitle>
			</CardHeader>
      <CardContent>
				<Form {...form}>
					<form
						onSubmit={form.handleSubmit(onSubmit)}
						className="space-y-6 flex flex-col h-full justify-between"
					>
						<div className="flex gap-6 flex-col">
							<FormField
								control={form.control}
								name="fullname"
								render={({ field }) => (
									<FormItem className="w-full">
										<FormControl>
											<Input placeholder="ФИО" {...field} />
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>
							<FormField
								control={form.control}
								name="email"
								render={({ field }) => (
									<FormItem className="w-full">
										<FormControl>
											<Input placeholder="Электронная почта" {...field} />
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>
							<div className="flex items-center gap-4">
								{avatarPreview && (
									<div className="h-16 w-16 rounded-full overflow-hidden border">
										<img src={avatarPreview} alt="Avatar preview" className="h-full w-full object-cover" />
									</div>
								)}
								<input
									type="file"
									id="avatar"
									ref={fileInputRef}
									accept="image/*"
									onChange={handleAvatarChange}
									className="hidden"
								/>
								<Button 
									type="button" 
									variant="outline" 
									onClick={() => fileInputRef.current?.click()}
								>
									<Upload className="h-4 w-4 mr-2" />
									Upload Photo
								</Button>
							</div>	
						</div>
						<Button>
							{ id ? "Сохранить" : "Создать" }
						</Button>
					</form>
				</Form>
      </CardContent>
    </Card>
  );
}

export const schema = z.object({
	fullname: z.string().min(1),
	email: z.string().min(1),
	password: z.string(),
})
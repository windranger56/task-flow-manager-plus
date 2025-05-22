import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Upload } from "lucide-react";

const Auth = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullname, setFullname] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    // Check for active session on component mount
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate("/");
      }
    });

    // Set up auth state listener
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        navigate("/");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  // Add debug logging for isSignUp state changes
  useEffect(() => {
    console.log("isSignUp state changed:", isSignUp);
  }, [isSignUp]);

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

  const validatePassword = (password: string): { isValid: boolean; message: string } => {
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
    const isLongEnough = password.length >= 8;

    const requirements = [];
    if (!isLongEnough) requirements.push("не менее 8 символов");
    if (!hasUpperCase) requirements.push("заглавную букву");
    if (!hasLowerCase) requirements.push("строчную букву");
    if (!hasNumbers) requirements.push("цифру");
    if (!hasSpecialChar) requirements.push("специальный символ");

    if (requirements.length > 0) {
      return { 
        isValid: false, 
        message: `Пароль не соответствует требованиям безопасности. Необходимо добавить: ${requirements.join(", ")}` 
      };
    }

    return { isValid: true, message: "" };
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      if (isSignUp) {
        // Validate password before registration
        const passwordValidation = validatePassword(password);
        if (!passwordValidation.isValid) {
          setError(passwordValidation.message);
          setIsLoading(false);
          return;
        }

        // Registration flow
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
          },
        });
        
        console.log("Sign up response:", data);
        
        if (signUpError) throw signUpError;
        
        if (data?.user?.identities?.length === 0) {
          setError("Пользователь с таким email уже существует");
          return;
        }

        if (!data.user || !data.user.id) {
          throw new Error("Не удалось получить данные пользователя");
        }

        let avatarUrl = null;

        // Upload avatar if a file was selected
        if (avatarFile && data.user) {
          const fileExt = avatarFile.name.split('.').pop();
          const filePath = `${data.user.id}/avatar.${fileExt}`;

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

        // Create user record in the users table
        try {
          const { error: userError } = await supabase
          .from('users')
          .insert({
            fullname,
            email,
            user_unique_id: data.user.id,
            image: avatarUrl,
          }, { count: 'exact' });
  
          if(userError) {
            console.error("Failed to create user record:", userError);
            throw new Error("Не удалось создать запись пользователя: " + userError.message);
          }
        } catch (insertError) {
          console.error("Insert error details:", insertError);
          // We'll continue even if this fails, as the auth user is already created
        }
        
        toast({
          title: "Регистрация успешна",
          description: "Проверьте вашу почту для подтверждения аккаунта",
        });
      } else {
        // Login flow
        const { data, error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        
        if (signInError) throw signInError;
        
        // Check if user exists in users table
        if (data.user) {
          try {
            const { data: userData, error: userDataError } = await supabase
              .from('users')
              .select('*')
              .eq('user_unique_id', data.user.id)
              .limit(1);
              
            console.log("User data check:", userData);
            
            // If user doesn't exist in the users table, create it
            if (!userData || userData.length === 0) {
              try {
                const { error: createError } = await supabase
                  .from('users')
                  .insert({
                    fullname: email.split('@')[0], // Default name from email
                    email,
                    user_unique_id: data.user.id,
                  }, { count: 'exact' });
                  
                if (createError) {
                  console.error("Failed to create user record during login:", createError);
                }
              } catch (insertError) {
                console.error("Error creating user during login:", insertError);
                // Continue even if this fails
              }
            }
          } catch (error) {
            console.error("Error checking user data:", error);
            // Continue navigation even if this fails
          }
        }
        
        navigate("/");
      }
    } catch (err: any) {
      console.error("Auth error:", err);
      let errorMessage = "Произошла ошибка";
      
      if (err.message === "Invalid login credentials") {
        errorMessage = "Неверный email или пароль";
      } else if (err.message.includes("password")) {
        errorMessage = "Пароль должен быть не менее 6 символов";
      } else if (err.message.includes("email")) {
        errorMessage = "Введите корректный email";
      } else if (err.message.includes("Email not confirmed")) {
        errorMessage = "Пожалуйста, подтвердите ваш email";
      }
      
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>{isSignUp ? "Регистрация" : "Вход"}</CardTitle>
          <CardDescription>
            {isSignUp
              ? "Создайте аккаунт для доступа к системе"
              : "Войдите в свой аккаунт"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <form onSubmit={handleAuth} className="space-y-4">
            {isSignUp && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="fullname">Фамилия Имя</Label>
                  <Input
                    id="fullname"
                    type="text"
                    placeholder="Fullname"
                    value={fullname}
                    onChange={(e) => setFullname(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="avatar">Аватар</Label>
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
              </>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">Эл.почта</Label>
              <Input
                id="email"
                type="email"
                placeholder="email@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Пароль</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder={isSignUp ? "Введите пароль" : "Введите пароль"}
              />
              {isSignUp && (
                <div className="space-y-1 mt-2 bg-muted/50 p-3 rounded-md">
                  <p className="text-sm font-medium">
                    Требования к паролю:
                  </p>
                  <ul className="text-xs list-disc pl-4 space-y-1 mt-1">
                    <li>Минимум 8 символов</li>
                    <li>Хотя бы одна заглавная буква (A-Z)</li>
                    <li>Хотя бы одна строчная буква (a-z)</li>
                    <li>Хотя бы одна цифра (0-9)</li>
                    <li>Хотя бы один специальный символ (!@#$%^&*(),.?":{}|&lt;&gt;)</li>
                  </ul>
                </div>
              )}
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Загрузка..." : isSignUp ? "Зарегистрироваться" : "Войти"}
            </Button>
          </form>
          <div className="mt-4 text-center">
            <Button
              variant="link"
              onClick={() => {
                console.log("Switching auth mode, current isSignUp:", isSignUp);
                setIsSignUp(!isSignUp);
              }}
              className="text-sm"
            >
              {isSignUp
                ? "Уже есть аккаунт? Войти"
                : "Нет аккаунта? Зарегистрироваться"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;
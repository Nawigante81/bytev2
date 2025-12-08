// Panel administracyjny do zarządzania użytkownikami i uprawnieniami
import React, { useState, useEffect, useCallback } from 'react';
import { Helmet } from 'react-helmet-async';
import { supabase } from '@/lib/supabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Loader2, Users, Shield, ShieldCheck, UserCheck, UserX, RefreshCw } from 'lucide-react';
import SectionTitle from '@/components/SectionTitle';
import PageTransition from '@/components/PageTransition';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/SupabaseAuthContext';

const UserManagement = () => {
  const { toast } = useToast();
  const { profile } = useAuth();
  const [users, setUsers] = useState([]);
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [searchEmail, setSearchEmail] = useState('');

  const isAdmin = profile?.role === 'admin';

  const fetchUsersAndProfiles = useCallback(async () => {
    if (!isAdmin) return;
    
    setLoading(true);
    try {
      // Pobierz użytkowników z edge function API
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast({ variant: 'destructive', title: 'Błąd autoryzacji', description: 'Brak sesji użytkownika' });
        return;
      }

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-users`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      });

      const result = await response.json();
      
      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Błąd pobierania użytkowników');
      }

      const { users: userList, stats } = result.data;
      setUsers(userList);
      setProfiles(userList.map(u => u.profile).filter(Boolean));
    } catch (err) {
      console.error('Błąd:', err);
      toast({ variant: 'destructive', title: 'Błąd pobierania danych', description: err.message });
    } finally {
      setLoading(false);
    }
  }, [isAdmin, toast]);

  const refreshData = async () => {
    setRefreshing(true);
    await fetchUsersAndProfiles();
    setRefreshing(false);
  };

  useEffect(() => {
    if (isAdmin) {
      fetchUsersAndProfiles();
    }
  }, [fetchUsersAndProfiles, isAdmin]);

  const callAdminApi = async (action, userId, payload = {}) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      throw new Error('Brak sesji użytkownika');
    }

    const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-users`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        action,
        userId,
        ...payload
      })
    });

    const result = await response.json();
    
    if (!response.ok || !result.success) {
      throw new Error(result.error || 'Błąd wykonania akcji');
    }

    return result.data;
  };

  const promoteToAdmin = async (userId) => {
    try {
      await callAdminApi('promote-admin', userId, { fullName: 'Administrator' });
      toast({ title: 'Użytkownik został promowany na administratora' });
      refreshData();
    } catch (err) {
      toast({ variant: 'destructive', title: 'Błąd promocji', description: err.message });
    }
  };

  const demoteToUser = async (userId) => {
    try {
      await callAdminApi('demote-user', userId);
      toast({ title: 'Użytkownik został zdegradowany do roli użytkownika' });
      refreshData();
    } catch (err) {
      toast({ variant: 'destructive', title: 'Błąd degradacji', description: err.message });
    }
  };

  const createProfile = async (userId) => {
    try {
      await callAdminApi('create-profile', userId, { fullName: 'Użytkownik' });
      toast({ title: 'Profil został utworzony' });
      refreshData();
    } catch (err) {
      toast({ variant: 'destructive', title: 'Błąd tworzenia profilu', description: err.message });
    }
  };

  const deleteProfile = async (userId) => {
    try {
      await callAdminApi('delete-profile', userId);
      toast({ title: 'Profil został usunięty' });
      refreshData();
    } catch (err) {
      toast({ variant: 'destructive', title: 'Błąd usuwania profilu', description: err.message });
    }
  };

  const getRoleBadge = (role) => {
    switch (role) {
      case 'admin':
        return <Badge className="bg-red-500/20 text-red-300 border-red-500/30"><ShieldCheck className="w-3 h-3 mr-1" />Admin</Badge>;
      case 'user':
        return <Badge className="bg-blue-500/20 text-blue-300 border-blue-500/30"><UserCheck className="w-3 h-3 mr-1" />User</Badge>;
      case 'no-profile':
        return <Badge className="bg-yellow-500/20 text-yellow-300 border-yellow-500/30"><UserX className="w-3 h-3 mr-1" />Brak profilu</Badge>;
      default:
        return <Badge variant="outline">{role}</Badge>;
    }
  };

  const filteredUsers = users.filter(user => 
    user.email?.toLowerCase().includes(searchEmail.toLowerCase()) ||
    user.profile?.full_name?.toLowerCase().includes(searchEmail.toLowerCase())
  );

  if (!isAdmin) {
    return (
      <PageTransition>
        <Helmet>
          <title>Brak dostępu - ByteClinic</title>
        </Helmet>
        <SectionTitle subtitle="Panel administracyjny">Brak dostępu</SectionTitle>
        <Card className="bg-card/80 border-destructive/20 backdrop-blur-sm">
          <CardContent className="pt-6">
            <p>Nie masz uprawnień do zarządzania użytkownikami.</p>
          </CardContent>
        </Card>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <Helmet>
        <title>Zarządzanie Użytkownikami - Panel Admina - ByteClinic</title>
      </Helmet>
      <SectionTitle subtitle="Zarządzaj użytkownikami i uprawnieniami">Zarządzanie Użytkownikami</SectionTitle>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-8">
        <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-500/20">
          <CardHeader>
            <CardTitle className="text-sm text-blue-400">Wszyscy użytkownicy</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold text-primary">{users.length}</p>
            <p className="text-xs text-muted-foreground mt-1">Zarejestrowani w systemie</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-red-500/10 to-red-600/5 border-red-500/20">
          <CardHeader>
            <CardTitle className="text-sm text-red-400">Administratorzy</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold text-red-400">{users.filter(u => u.role === 'admin').length}</p>
            <p className="text-xs text-muted-foreground mt-1">Pełne uprawnienia</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-500/10 to-green-600/5 border-green-500/20">
          <CardHeader>
            <CardTitle className="text-sm text-green-400">Użytkownicy</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold text-green-400">{users.filter(u => u.role === 'user').length}</p>
            <p className="text-xs text-muted-foreground mt-1">Standardowi użytkownicy</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-yellow-500/10 to-yellow-600/5 border-yellow-500/20">
          <CardHeader>
            <CardTitle className="text-sm text-yellow-400">Bez profili</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold text-yellow-400">{users.filter(u => u.role === 'no-profile').length}</p>
            <p className="text-xs text-muted-foreground mt-1">Wymagają konfiguracji</p>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-card/80 border-primary/20 backdrop-blur-sm mb-8">
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <CardTitle>Lista użytkowników</CardTitle>
              <CardDescription>Zarządzaj uprawnieniami i profilami użytkowników</CardDescription>
            </div>
            <Button variant="outline" onClick={refreshData} disabled={refreshing}>
              {refreshing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
              Odśwież
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <Input
              placeholder="Szukaj po emailu lub nazwie..."
              value={searchEmail}
              onChange={(e) => setSearchEmail(e.target.value)}
              className="max-w-sm"
            />
          </div>

          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="w-8 h-8 animate-spin" /></div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Nazwa</TableHead>
                    <TableHead>Rola</TableHead>
                    <TableHead>Utworzony</TableHead>
                    <TableHead className="text-right">Akcje</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">{user.email}</TableCell>
                      <TableCell>{user.profile?.full_name || 'Brak'}</TableCell>
                      <TableCell>{getRoleBadge(user.role)}</TableCell>
                      <TableCell>{new Date(user.created_at).toLocaleDateString('pl-PL')}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center gap-2 justify-end">
                          {user.role === 'admin' ? (
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => demoteToUser(user.id)}
                            >
                              <UserX className="w-3 h-3 mr-1" />
                              Degraduj
                            </Button>
                          ) : (
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => promoteToAdmin(user.id)}
                            >
                              <ShieldCheck className="w-3 h-3 mr-1" />
                              Promuj
                            </Button>
                          )}
                          
                          {!user.hasProfile && (
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => createProfile(user.id)}
                            >
                              <UserCheck className="w-3 h-3 mr-1" />
                              Profil
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </PageTransition>
  );
};

export default UserManagement;
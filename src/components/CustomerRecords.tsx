
import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { getAllCustomerRecords, deleteCustomerRecord, CustomerRecord } from "@/services/supabaseService";
import { toast } from "sonner";
import { Loader2, Trash2, RefreshCw } from "lucide-react";

const CustomerRecords: React.FC = () => {
  const [records, setRecords] = useState<CustomerRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [recordToDelete, setRecordToDelete] = useState<CustomerRecord | null>(null);

  const fetchRecords = async () => {
    try {
      setLoading(true);
      const data = await getAllCustomerRecords();
      setRecords(data);
    } catch (error) {
      console.error('Error fetching records:', error);
      toast.error('Failed to load customer records');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClick = (record: CustomerRecord) => {
    setRecordToDelete(record);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!recordToDelete) return;
    
    try {
      setDeleting(recordToDelete.id);
      await deleteCustomerRecord(recordToDelete.id);
      toast.success('Record deleted successfully');
      
      // Remove the deleted record from state without refetching
      setRecords(prev => prev.filter(record => record.id !== recordToDelete.id));
      
      setDeleteDialogOpen(false);
      setRecordToDelete(null);
    } catch (error) {
      console.error('Error deleting record:', error);
      toast.error('Failed to delete record');
    } finally {
      setDeleting(null);
    }
  };

  useEffect(() => {
    fetchRecords();
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Customer Records</h2>
        <Button onClick={fetchRecords} variant="outline" size="sm" className="gap-2">
          <RefreshCw className="h-4 w-4" />
          Refresh
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center p-8">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : records.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">No records found. Upload a PDF to create your first record.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {records.map((record) => (
            <Card key={record.id}>
              <CardHeader>
                <CardTitle className="flex justify-between">
                  <span>{record.month} {new Date(record.created_at).getFullYear()}</span>
                  <span className="text-muted-foreground text-sm">{record.billing_date}</span>
                </CardTitle>
                <CardDescription>{record.address}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <p className="text-sm font-medium">Consumption</p>
                    <p className="text-lg">{record.consumption} kWh</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Generation</p>
                    <p className="text-lg">{record.generation} kWh</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Savings</p>
                    <p className="text-lg">₹{record.savings}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Efficiency</p>
                    <p className="text-lg">{record.top_gen}</p>
                  </div>
                </div>
              </CardContent>
              <CardFooter>
                <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                  <DialogTrigger asChild>
                    <Button 
                      variant="destructive" 
                      size="sm" 
                      className="ml-auto gap-2"
                      onClick={() => handleDeleteClick(record)}
                      disabled={deleting === record.id}
                    >
                      {deleting === record.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                      Delete
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Are you sure you want to delete this record?</DialogTitle>
                      <DialogDescription>
                        This action cannot be undone. This will permanently delete the record for {recordToDelete?.month} {recordToDelete && new Date(recordToDelete.created_at).getFullYear()}.
                      </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button 
                        variant="destructive" 
                        onClick={handleDeleteConfirm}
                        disabled={deleting === recordToDelete?.id}
                      >
                        {deleting === recordToDelete?.id ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            Deleting...
                          </>
                        ) : (
                          'Delete Record'
                        )}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default CustomerRecords;

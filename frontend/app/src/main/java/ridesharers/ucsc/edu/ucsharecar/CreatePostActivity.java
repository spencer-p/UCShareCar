package ridesharers.ucsc.edu.ucsharecar;

import android.app.AlertDialog;
import android.app.DatePickerDialog;
import android.app.TimePickerDialog;
import android.content.Context;
import android.content.Intent;
import android.nfc.Tag;
import android.support.v7.app.AppCompatActivity;
import android.os.Bundle;
import android.util.Log;
import android.view.View;
import android.widget.AdapterView;
import android.widget.ArrayAdapter;
import android.widget.Button;
import android.widget.DatePicker;
import android.widget.EditText;
import android.widget.RadioButton;
import android.widget.RadioGroup;
import android.widget.Spinner;
import android.widget.TimePicker;
import android.widget.Toast;

import com.android.volley.Response;
import com.android.volley.VolleyError;

import java.util.ArrayList;
import java.util.Calendar;
import java.util.Date;

public class CreatePostActivity extends AppCompatActivity implements AdapterView.OnItemSelectedListener {
    Context mContext;
    BackendClient backendClient;
    Spinner originSpinner, destinationSpinner, seatsSpinner;
    private AlertDialog.Builder builder;
    private AlertDialog popup;


    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_create_post);
        mContext = this;

        originSpinner = findViewById(R.id.start_spinner);
        destinationSpinner = findViewById(R.id.destination_spinner);
        seatsSpinner = findViewById(R.id.seats_spinner);

        Button date_btn = (Button) findViewById(R.id.btn_date);
        Button time_btn = (Button) findViewById(R.id.btn_time);
        final EditText date_txt = (EditText) findViewById(R.id.in_date);
        final EditText time_txt = (EditText) findViewById(R.id.in_time);


        date_btn.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View view) {
                int mYear, mMonth, mDay;
                final Calendar calendar = Calendar.getInstance();
                mYear = calendar.get(Calendar.YEAR);
                mMonth = calendar.get(Calendar.MONTH);
                mDay = calendar.get(Calendar.DAY_OF_MONTH);

                DatePickerDialog datePickerDialog = new DatePickerDialog(mContext, new DatePickerDialog.OnDateSetListener() {
                    @Override
                    public void onDateSet(DatePicker datePicker, int year, int month, int day) {
                        date_txt.setText(day + "-" + month + "-" + year);
                    }
                }, mYear, mMonth, mDay);

                datePickerDialog.show();
            }
        });

        time_btn.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View view) {
                final Calendar calendar = Calendar.getInstance();
                int mHour = calendar.get(Calendar.HOUR);
                int mMinute = calendar.get(Calendar.MINUTE);

                TimePickerDialog timePickerDialog = new TimePickerDialog(mContext, new TimePickerDialog.OnTimeSetListener() {
                    @Override
                    public void onTimeSet(TimePicker timePicker, int hour, int minute) {
                        time_txt.setText(hour + ":" + minute);
                    }
                }, mHour, mMinute, false);
                timePickerDialog.show();
            }
        });

        Button upload_btn = (Button) findViewById(R.id.ok_editor);
        upload_btn.setOnClickListener(new View.OnClickListener() {
        @Override
        public void onClick(View view) {
            EditText memo_text = (EditText) findViewById(R.id.details_editor);
            RadioGroup radioGroup = (RadioGroup) findViewById(R.id.radioGroup);
            int radioSelected = radioGroup.getCheckedRadioButtonId();

            final Date postTime = new Date();
            final Date departTime = new Date();
            final String start = originSpinner.getSelectedItem().toString();
            final String dest = destinationSpinner.getSelectedItem().toString();
            final String memo = memo_text.getText().toString();
            final boolean driver_needed = (radioSelected == 0) ? false : true;
            final String driver = "";
            final String uploader = "";
            final ArrayList<String> passengers = new ArrayList<String>();
            final int totalSeats = Integer.parseInt(seatsSpinner.getSelectedItem().toString());

            builder = new AlertDialog.Builder(CreatePostActivity.this);
            View mView = getLayoutInflater().inflate(R.layout.post_upload_check,null);
            Button yesButton = mView.findViewById(R.id.yes);
            Button noButton = mView.findViewById(R.id.no);
            builder.setView(mView);
            popup = builder.create();
            popup.show();

            yesButton.setOnClickListener(new View.OnClickListener(){
                @Override
                public void onClick(View view) {
                    backendClient.createPost(new PostInfo(postTime, departTime, start, dest, memo, driver_needed, driver, uploader, passengers, totalSeats),
                            new Response.Listener<String>() {
                                @Override
                                public void onResponse(String response) {
                                    Log.e("sending post to server", "sending post to server");
                                    Intent refresh_page_intent = new Intent(getApplicationContext(), PostListActivity.class);
                                    startActivity(refresh_page_intent);

                                }

                            }, new Response.ErrorListener() {
                                @Override
                                public void onErrorResponse(VolleyError error) {
                                    Toast.makeText(getApplicationContext(), (String) error.toString(), Toast.LENGTH_LONG).show();
                                }
                            });
                }
            });

            noButton.setOnClickListener(new View.OnClickListener(){
                @Override
                public void onClick(View view){
                    popup.cancel();
                }
            });

        }
    });

        Button back_button = findViewById(R.id.no_editor);
        back_button.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View view) {
                Intent back_intent = new Intent(getApplicationContext(), PostListActivity.class);
                startActivity(back_intent);
            }
        });
    }

    @Override
    public void onItemSelected(AdapterView<?> parent, View view, int position, long id) {
        String origin = parent.getItemAtPosition(position).toString();
        Toast.makeText(parent.getContext(), origin, Toast.LENGTH_SHORT).show();

        String destination = parent.getItemAtPosition(position).toString();
        Toast.makeText(parent.getContext(), destination, Toast.LENGTH_SHORT);
    }

    @Override
    public void onNothingSelected(AdapterView<?> parent) {

    }
}

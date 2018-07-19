package ridesharers.ucsc.edu.ucsharecar;

import android.content.Context;
import android.content.Intent;
import android.os.Bundle;
import android.support.design.widget.FloatingActionButton;
import android.support.v7.app.AppCompatActivity;
import android.support.v7.widget.LinearLayoutManager;
import android.support.v7.widget.RecyclerView;
import android.support.v7.widget.Toolbar;
import android.util.Log;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.AdapterView;
import android.widget.ArrayAdapter;
import android.widget.ImageButton;
import android.widget.Spinner;
import android.widget.Toast;

import com.android.volley.Response;
import com.android.volley.VolleyError;

import ridesharers.ucsc.edu.ucsharecar.dummy.RecyclerViewAdapter;

import java.util.ArrayList;
import java.util.Date;

/**
 * An activity representing a list of Posts. This activity
 * has different presentations for handset and tablet-size devices. On
 * handsets, the activity presents a list of items, which when touched,
 * lead to a {@link PostDetailActivity} representing
 * item details. On tablets, the activity presents the list of items and
 * item details side-by-side using two vertical panes.
 */
public class PostListActivity extends AppCompatActivity implements AdapterView.OnItemSelectedListener {

    /**
     * Whether or not the activity is in two-pane mode, i.e. running on a tablet
     * device.
     */
    //private boolean mTwoPane;

    private final String TAG = "UCShareCar_PostList";

    //vars
    private ArrayList<PostInfo> postList = new ArrayList<>();

    private BackendClient backend;
    private Context postListContext;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_post_list);

        //Spinners
        Spinner originSpinner = findViewById(R.id.start_spinner);
        ArrayAdapter<CharSequence> originAdapter = ArrayAdapter.createFromResource(PostListActivity.this, R.array.StartingLocations, android.R.layout.simple_spinner_item);
        originAdapter.setDropDownViewResource(android.R.layout.simple_spinner_dropdown_item);
        originSpinner.setAdapter(originAdapter);
        originSpinner.setOnItemSelectedListener(PostListActivity.this);

        Spinner destinationSpinner = findViewById(R.id.destination_spinner);
        ArrayAdapter<CharSequence> destinationAdapter = ArrayAdapter.createFromResource(PostListActivity.this, R.array.EndingLocations, android.R.layout.simple_spinner_item);
        destinationAdapter.setDropDownViewResource(android.R.layout.simple_spinner_dropdown_item);
        destinationSpinner.setAdapter(destinationAdapter);
        destinationSpinner.setOnItemSelectedListener(PostListActivity.this);

        ImageButton my_page = findViewById(R.id.my_page);
        my_page.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View view) {
                Log.d(TAG, "clicked my_page button");
                Intent my_page_intent = new Intent(getApplicationContext(), MyPage.class);
                startActivity(my_page_intent);
            }
        });

        ImageButton add_post = findViewById(R.id.add_post);
        add_post.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View view) {
                Log.d(TAG, "clicked add_post button");
                Intent add_intent = new Intent(getApplicationContext(), CreatePostActivity.class);
                startActivity(add_intent);
            }
        });

        ImageButton add_report = findViewById(R.id.add_report);
        add_report.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View view) {
                Log.d(TAG,"clicked add_report button");
                Intent this_intent = new Intent(getApplicationContext(), CreateReportActivity.class);
                startActivity(this_intent);
            }
        });


        ImageButton search = findViewById(R.id.search);
        search.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View view) {
                Log.d(TAG, "clicked search button");
                Intent search_intent = new Intent (getApplicationContext(), PostListActivity.class);
                startActivity(search_intent);
            }
        });

        // Get the backend object
        backend = BackendClient.getSingleton(this);
        setupRecyclerView();
    }

    @Override
    public void onStart() {
        super.onStart();

        if (!backend.hasSession()) {
            Log.w(TAG, "Sending user to login page");
            Intent intent = new Intent(this, LoginActivity.class);
            startActivity(intent);
        }
    }

    private void setupRecyclerView() {
        RecyclerView recyclerView = findViewById(R.id.recycler_view);
        recyclerView.setLayoutManager(new LinearLayoutManager(this));
        final PostListAdapter adapter = new PostListAdapter(this, postList);
        recyclerView.setAdapter(adapter);
        recyclerView.setLayoutManager(new LinearLayoutManager(this));

        Log.d(TAG, "setupRecyclerView: init recycleview.");

        backend.getAllPosts(new Response.Listener<ArrayList<PostInfo>>() {
            @Override
            public void onResponse(ArrayList<PostInfo> response) {
                postList.addAll(response);
                adapter.notifyDataSetChanged();
            }
        }, new Response.ErrorListener() {
            @Override
            public void onErrorResponse(VolleyError error) {
                Log.e(TAG, error.toString());
                Toast.makeText(getApplicationContext(), (String) error.toString(), Toast.LENGTH_LONG).show();
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
